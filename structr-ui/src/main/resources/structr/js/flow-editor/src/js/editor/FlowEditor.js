'use strict';

import {FlowCall} from "./entities/FlowCall.js";
import {FlowDataSource} from "./entities/FlowDataSource.js";
import {FlowReturn} from "./entities/FlowReturn.js";
import {FlowNode} from "./entities/FlowNode.js";
import {FlowAction} from "./entities/FlowAction.js";
import {FlowParameterInput} from "./entities/FlowParameterInput.js";
import {FlowConnectionTypes} from "./FlowConnectionTypes.js";
import {Persistence} from "../persistence/Persistence.js";
import {FlowParameterDataSource} from "./entities/FlowParameterDataSource.js";
import {FlowNotNull} from "./entities/FlowNotNull.js";
import {FlowDecision} from "./entities/FlowDecision.js";
import {FlowKeyValue} from "./entities/FlowKeyValue.js";
import {FlowObjectDataSource} from "./entities/FlowObjectDataSource.js";
import {FlowStore} from "./entities/FlowStore.js";
import {FlowScriptCondition} from "./entities/FlowScriptCondition.js";
import {FlowNot} from "./entities/FlowNot.js";
import {FlowOr} from "./entities/FlowOr.js";
import {FlowAnd} from "./entities/FlowAnd.js";
import {FlowForEach} from "./entities/FlowForEach.js";
import {Rest} from "../rest/Rest.js";
import {CodeModal} from "./utility/CodeModal.js";
import {DependencyLoader} from "./utility/DependencyLoader.js";
import {FlowAggregate} from "./entities/FlowAggregate.js";
import {FlowConstant} from "./entities/FlowConstant.js";
import {FlowGetProperty} from "./entities/FlowGetProperty.js";
import {FlowCollectionDataSource} from "./entities/FlowCollectionDataSource.js";
import {LayoutManager} from "./utility/LayoutManager.js";
import {LayoutModal} from "./utility/LayoutModal.js";
import {FlowExceptionHandler} from "./entities/FlowExceptionHandler.js";
import {ResultPanel} from "./utility/ResultPanel.js";
import {AreaSelector} from "./utility/AreaSelector.js";
import {FlowTypeQuery} from "./entities/FlowTypeQuery.js";



export class FlowEditor {

    constructor(rootElement, flowContainer, options) {

        this._initializationPromise = new Promise(resolve => {

            this._injectDependencies().then(() => {


                this._editorId = 'structr-flow-editor@0.1.0';

                this._flowContainer = flowContainer;
                this._rootElement = rootElement;
                this.flowNodes = [];

                window._rootElement = rootElement;

                this._setupEditor();

                if (options && !options.deactivateInternalEvents) {
                    document.addEventListener('floweditor.internal.openeditor', e => {
                        new CodeModal(e.detail.element);
                    });
                }

                resolve();

            });

        });

    }


    waitForInitialization() {
        return this._initializationPromise;
    }

    cleanup() {
        this._unregisterKeybinds()
    }

    _injectDependencies() {
        let dep = new DependencyLoader();
        let depObject = {
            scripts: [
                "lib/d3-node-editor/d3.min.js",
                "lib/d3-node-editor/alight.min.js"
            ],
            stylesheets: [
                "lib/d3-node-editor/d3-node-editor.css"
				, "../../../css/flow-editor.css"
            ]
        };

        return dep.injectDependencies(depObject).then( () => {return dep.injectScript("lib/d3-node-editor/d3-node-editor.js");})
    }

    _setupEditor() {
        this._editor = new D3NE.NodeEditor(this._editorId, this._rootElement, this._getComponents(), this._getMenu());

        // Extend the maximum viewport to feature a much larger workspace
        this._editor.view.setTranslateExtent(-65536, -65536, 65536, 65536);
        this._editor.view.setScaleExtent(0.01, 1);

        // Override default D3NE event bindings
        d3.select(this._rootElement).on('click', () => {
            if (d3.event.target === this._rootElement) {
                this._editor.view.pickedOutput = null;
                this._editor.selected.list = [];
                this._editor.view.update();
            }
        });

        // Bind context menu to right click instead of left click
        this._rootElement.oncontextmenu = event => {
            if (event.target === this._rootElement) {
                this._editor.view.assignContextMenuHandler();
                this._editor.view.contextMenu.show(event.clientX-20, event.clientY);
            }
            return false;
        };

        this._editor.eventListener.on('connectioncreate', (data) =>{
            try {
                this._connectionCreationHandler(data.input, data.output);
            } catch (e) {
                this._editor.eventListener.trigger('error',e);
                return false;
            }
        });

        this._editor.eventListener.on('connectionremove', (data) =>{
            this._connectionDeletionHandler(data);
        });

        this._editor.eventListener.on('noderemove', (data) =>{
            this._nodeDeletionHandler(data);
        });

        //Initialize area selector
        new AreaSelector(this);

        this._registerKeybinds();

    }

    _getEventHandlers() {
        const self = this;
        if (this._eventHandlers === undefined) {
            this._eventHandlers = {
                local: {
                    keydown: function (event) {
                        if (event.shiftKey === true && event.ctrlKey === true) {
                            // Enable area selection on shift+ctrl
                            new AreaSelector(self).enable();
                            event.stopPropagation();
                        } else if (event.key === "a" && event.ctrlKey === true) {
                            // Select all nodes and prevent default selection
                            self.selectAllNodes();
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                },
                global: {
                    keydown: function (event) {
                        if (event.key === 'x' && event.altKey === true) {
                            // Execute flow on alt+x
                            self.executeFlow();
                            event.stopPropagation();
                        } else if (event.key === 'l' && event.altKey === true) {
                            // Open layout modal on alt+l
                            new LayoutModal(self);
                            event.stopPropagation();
                        } else if (event.key === 's' && event.altKey === true) {
                            event.stopPropagation();
                            // Save layout on alt+s
                            if (confirm('Save layout?')) {
                                if (confirm('Save as public layout?')) {
                                    self.saveLayout(true);
                                } else {
                                    self.saveLayout(false);
                                }
                            }
                        } else if (event.key === 'Escape') {
                            // Close panel on ESC and clear selection
                            event.stopPropagation();
                            ResultPanel.removePanel();
                            self._editor.selected.list = [];
                            self._editor.view.update();
                        } else if (event.key === "p" && event.altKey === true) {
                            const id = prompt("Enter UUID for FlowNode to search for:");
                            self.selectNodeById(id);
                            event.stopPropagation();
                        } else if (event.key === "o" && event.altKey === true) {
                            self._editor.selected.list.map((node) => console.log(node.data.dbNode.type + '[' + node.data.dbNode.id + "]"));
                            event.stopPropagation();
                        }
                    },
                    keyup: function (event) {
                        if (event.key === "Shift" || event.key === "Ctrl") {
                            // Stop area selection on shift or ctrl keyup
                            new AreaSelector(self).disable();
                            event.stopPropagation();
                        }
                    }
                }
            };
            return this._eventHandlers;
        } else {
            return this._eventHandlers;
        }
    }

    _registerKeybinds() {
        // Local binds
        this._rootElement.addEventListener('keydown', this._getEventHandlers().local.keydown);

        // Global binds
        document.addEventListener('keydown', this._getEventHandlers().global.keydown);
        document.addEventListener('keyup', this._getEventHandlers().global.keyup);

    }

    _unregisterKeybinds() {
        //  Local binds
        this._rootElement.removeEventListener('keydown', this._getEventHandlers().local.keydown);

        // Global binds
        document.removeEventListener('keydown', this._getEventHandlers().global.keydown);
        document.removeEventListener('keyup', this._getEventHandlers().global.keyup);
    }

    static _getViableStartNodes() {
        return [
            'FlowAction',
            'FlowCall',
            'FlowDecision',
            'FlowForEach',
            'FlowReturn',
            'FlowStore',
            'FlowAggregate'
        ];
    }

    _getContextMenuItemsForElement(editor, element) {
        let items = {};

        const viableStartNodeTypes = FlowEditor._getViableStartNodes();


        if ( viableStartNodeTypes.filter( t => (t===element.dbNode.type) ).length > 0 ) {
            items['Set as start node'] = function setAsStartNode() {
                element.dbNode.isStartNodeOfContainer = editor._flowContainer.id;
                let oldStartNode = document.querySelector("div.title.startNode");
                if (oldStartNode !== undefined && oldStartNode !== null) {
                    oldStartNode.classList.remove("startNode");
                }
                element.editorNode.el.querySelector("div.title").classList.add("startNode");
            };
        }

        if (element instanceof FlowCall && element.dbNode.flow !== null) {
            items['Go to flow'] = function goToFlow() {
                let flow = element.dbNode.flow;
                if (flow !== undefined && flow !== null) {

                    let id = undefined;

                    if (flow instanceof Object) {
                        id = flow.id;
                    } else {
                        id = flow;
                    }

                    const loadEvent = new CustomEvent("floweditor.loadflow", {detail: {id: id}});
                    document.dispatchEvent(loadEvent);

                    /*
                    let searchParams = new URLSearchParams(window.location.search);
                    searchParams.set("id", id);
                    window.location.search = searchParams.toString();
                    */
                }
            }
        }

        items['Remove node'] = function RemoveNode() {
            this._editor.removeNode(element.editorNode);
        };

        return items;
    }

    // HACK: replace the default D3NE context menu for nodes
    _overrideContextMenu(element) {
        let self = this;

        d3.select(element.editorNode.el).on('contextmenu', null);

        let onClick = function onClick(subitem) {
            subitem.call(self);
            self._editor.view.contextMenu.hide();
        };

        d3.select(element.editorNode.el).on('contextmenu', () => {
            if (self._editor.readOnly) return;

            let x = d3.event.clientX;
            let y = d3.event.clientY;

            self._editor.selectNode(element.editorNode);
            self._editor.view.contextMenu.show(x, y, this._getContextMenuItemsForElement(self, element), false, onClick);
            d3.event.preventDefault();
        });

    }

    _connectionCreationHandler(input, output) {

        if (input.node.id === output.node.id) {
            this._editor.view.pickedOutput = null;
            throw new TypeError("Cannot connect a node to itself. Cancelling connection creation.");
        }

        if(input.node.data.dbNode !== undefined && output.node.data.dbNode !== undefined) {
            try {
                for (let [key, con] of Object.entries(FlowConnectionTypes.getInst().getAllConnectionTypes())) {

                    if (con.sourceAttribute === output.socket.id && con.targetAttribute === input.socket.id) {
                        let sourceId = output.node.data.dbNode.id;
                        let targetId = input.node.data.dbNode.id;
                        let relType = con.type;

                        let persistence = new Persistence();

                        persistence.getNodesByClass({type:relType}).then( result => {

                            let shouldCreate = result.filter( el => el.sourceId == sourceId && el.targetId == targetId).length == 0;

                            if (shouldCreate) {
                                persistence.createNode({type: relType, sourceId: sourceId, targetId: targetId});
                            }
                        });

                        break;
                    }

                }
            } catch (e) {
                console.log("Exception during rel creation:");
                console.log(e);
            }

        }

    }

    _connectionDeletionHandler(connection) {
        let persistence = new Persistence();
        persistence.deleteNode(connection);
    }

    _nodeDeletionHandler(node) {
        let persistence = new Persistence();
        persistence.deleteNode(node.data.dbNode);
    }

    _getFlowClasses() {
        return [
            new FlowAction(),
            new FlowCall(),
            new FlowDataSource(),
            new FlowParameterInput(),
            new FlowParameterDataSource(),
            new FlowReturn(),
            new FlowNode(),
            new FlowNotNull(),
            new FlowDecision(),
            new FlowKeyValue(),
            new FlowObjectDataSource(),
            new FlowStore(),
            new FlowScriptCondition(),
            new FlowNot(),
            new FlowOr(),
            new FlowAnd(),
            new FlowForEach(),
            new FlowAggregate(),
            new FlowConstant(),
            new FlowGetProperty(),
            new FlowCollectionDataSource(),
            new FlowExceptionHandler(),
            new FlowTypeQuery()
        ];
    }

    _getComponents() {

        if(this._components === undefined) {
            this._components = [];

            for (let comp of this._getFlowClasses()) {
               this._components.push(comp.getComponent());
            }
        }
        return this._components;
    }


    _getNodeCreationFunction(type) {
        let self = this;
        let entType = type;
        return function() {
            let persistence = new Persistence();
            return persistence.createNode({type: entType}).then(node => {
                if ((self.flowNodes.filter(node => node.isStartNodeOfContainer !== null).length <= 0)
                    && (FlowEditor._getViableStartNodes().indexOf(node.type) !== -1)) {
                    node.isStartNodeOfContainer = self._flowContainer.id;
                }
                let fNode = self.renderNode(node);
                node.flowContainer = self._flowContainer.id;
                fNode.editorNode.position = self._editor.view.mouse;
                self._editor.view.update();
                return node;
            });
        }
    }

    _getMenu() {
        let self = this;

        let menu = new D3NE.ContextMenu({
            'Action Nodes': {
                'Action' : self._getNodeCreationFunction("FlowAction"),
                'Call' : self._getNodeCreationFunction("FlowCall"),
                'ForEach' : self._getNodeCreationFunction("FlowForEach"),
                'Aggregate' : self._getNodeCreationFunction("FlowAggregate"),
                'ExceptionHandler': self._getNodeCreationFunction("FlowExceptionHandler"),
                'Return' : self._getNodeCreationFunction("FlowReturn")
            },
            'Data Nodes': {
                'DataSource' : self._getNodeCreationFunction("FlowDataSource"),
                'Constant' : self._getNodeCreationFunction("FlowConstant"),
                'CollectionDataSource' : self._getNodeCreationFunction("FlowCollectionDataSource"),
                'ObjectDataSource' : self._getNodeCreationFunction("FlowObjectDataSource"),
                'KeyValue' : self._getNodeCreationFunction("FlowKeyValue"),
                'ParameterInput' : self._getNodeCreationFunction("FlowParameterInput"),
                'ParameterDataSource' : self._getNodeCreationFunction("FlowParameterDataSource"),
                'Store' : self._getNodeCreationFunction("FlowStore"),
                'GetProperty': self._getNodeCreationFunction("FlowGetProperty"),
                'TypeQuery': self._getNodeCreationFunction("FlowTypeQuery")
            },
            'Logic Nodes': {
                'Decision' : self._getNodeCreationFunction("FlowDecision"),
                'NotNull' : self._getNodeCreationFunction("FlowNotNull"),
                'Not' : self._getNodeCreationFunction("FlowNot"),
                'Or' : self._getNodeCreationFunction("FlowOr"),
                'And' : self._getNodeCreationFunction("FlowAnd"),
                'ScriptCondition' : self._getNodeCreationFunction("FlowScriptCondition")
            },
            'Actions': {
                'Execute Flow': function() { self.executeFlow() },
                'Reset View': function() { self.resetView() },
                'Select & Apply Layout' : function() { new LayoutModal(self) }
            }
        }, false);

        return menu;
    }


    resetView() {
        this._editor.view.zoomAt(this.flowNodes.map( n => n.editorNode ));
    }

    executeFlow() {

        let rest = new Rest();

        rest.post('/structr/rest/FlowContainer/' + this._flowContainer.id + '/evaluate', {}, true).then((res) => {
            new ResultPanel(res, this);
        });

    }

    async saveLayout(visibleForPublic) {

        let pub = visibleForPublic !== undefined ? visibleForPublic : false;

        let layoutManager = new LayoutManager(this);
        await layoutManager.saveLayout(pub);

    }

    async applySavedLayout() {

        let layoutManager = new LayoutManager(this);
        let layout = await layoutManager.getOwnSavedLayout();

        if (layout === null) {
            let layouts = await layoutManager.getSavedLayouts();

            if (layouts !== null && layouts.length > 0) {

                layoutManager.applySavedLayout(layouts[0]);
            }
        }

        layoutManager.applySavedLayout(layout);

    }


    connectNodes(rel) {
        let source = this.getFlowNodeForDbId(rel.sourceId);
        let target = this.getFlowNodeForDbId(rel.targetId);

        if (source !== undefined && target !== undefined) {
            let connectionType = FlowConnectionTypes.getInst().getConnectionType(rel.type);

            let output = source.editorNode.outputs.filter(o => o.socket.id === connectionType.sourceAttribute)[0];
            let input = target.editorNode.inputs.filter(i => i.socket.id === connectionType.targetAttribute)[0];

            try {
                if (output !== undefined && output !== null && input !== undefined && input !== null) {
                    this._editor.connect(output, input);

                    let connection = output.connections.filter(c => c.input === input)[0];
                    connection.label = connectionType.name;
                    connection.type = connectionType.type;
                    connection.id = rel.id;
                }
            } catch (e) {
                console.log("Could not connect nodes: " + rel.sourceId + " and " + rel.targetId + " RelType: " + rel.type);
            }

        }

    }

    renderNode(node) {
        let fNode = undefined;
        switch (node.type) {
            case 'FlowAction':
                fNode = new FlowAction(node, this);
                break;
            case 'FlowCall':
                fNode = new FlowCall(node, this);
                break;
            case 'FlowDataSource':
                fNode = new FlowDataSource(node, this);
                break;
            case 'FlowReturn':
                fNode = new FlowReturn(node, this);
                break;
            case 'FlowParameterInput':
                fNode = new FlowParameterInput(node, this);
                break;
            case 'FlowParameterDataSource':
                fNode = new FlowParameterDataSource(node, this);
                break;
            case 'FlowNotNull':
                fNode = new FlowNotNull(node, this);
                break;
            case 'FlowDecision':
                fNode = new FlowDecision(node, this);
                break;
            case 'FlowKeyValue':
                fNode = new FlowKeyValue(node, this);
                break;
            case 'FlowObjectDataSource':
                fNode = new FlowObjectDataSource(node, this);
                break;
            case 'FlowStore':
                fNode = new FlowStore(node, this);
                break;
            case 'FlowScriptCondition':
                fNode = new FlowScriptCondition(node, this);
                break;
            case 'FlowNot':
                fNode = new FlowNot(node, this);
                break;
            case 'FlowOr':
                fNode = new FlowOr(node, this);
                break;
            case 'FlowAnd':
                fNode = new FlowAnd(node, this);
                break;
            case 'FlowForEach':
                fNode = new FlowForEach(node, this);
                break;
            case 'FlowAggregate':
                fNode = new FlowAggregate(node, this);
                break;
            case 'FlowConstant':
                fNode = new FlowConstant(node, this);
                break;
            case 'FlowGetProperty':
                fNode = new FlowGetProperty(node, this);
                break;
            case 'FlowCollectionDataSource':
                fNode = new FlowCollectionDataSource(node, this);
                break;
            case 'FlowExceptionHandler':
                fNode = new FlowExceptionHandler(node, this);
                break;
            case 'FlowTypeQuery':
                fNode = new FlowTypeQuery(node, this);
                break;
            default:
                console.log('FlowEditor: renderNode() -> Used default FlowNode class. Implement custom class for proper handling! Given node type: ' + node.type);
                fNode = new FlowNode(node, this);
                break;
        }

        let component = fNode.getComponent();
        let editorNode = component.builder(component.newNode());
        fNode.editorNode = editorNode;

        this.flowNodes.push(fNode);

        this._editor.addNode(editorNode);

        this._editor.view.update();

        this._overrideContextMenu(fNode);

        return fNode;
    }

    getFlowNodeForDbId(id) {

        for (let node of this.flowNodes) {
            if (node.dbNode.id === id) {
                return node;
            }
        }
        return undefined;
    }

    getFlowNodeForEditorNode(editorNode) {

        for (let node of this.flowNodes) {
            if (node.editorNode.id === editorNode.id) {
                return node;
            }
        }
        return undefined;
    }

    getEditorJson() {
        return this._editor.toJSON();
    }

    selectAllNodes() {
        this._editor.selected.list = this.flowNodes.map( n => n.editorNode);
        this._editor.view.update();
    }

    selectNodeById(id) {
        this._editor.selected.list = this.flowNodes.filter((fNode) => {return fNode.dbNode.id === id}).map( n => n.editorNode);
        this._editor.view.update();
    }

    static _rectContainsRect(r1,r2) {
        return (r2.x + r2.w) < (r1.x + r1.w)
            && (r2.x) > (r1.x)
            && (r2.y) > (r1.y)
            && (r2.y + r2.h) < (r1.y + r1.h);
    }

    selectAllNodesInRectangle(p1,p2) {
        this._editor.selected.list = [];

        let view = this._editor.view;

        for (let node of this.flowNodes) {

            let nodePos = node.editorNode.position;

            if (
                FlowEditor._rectContainsRect({
                    x: (view.transform.x * -1) + p1[0],
                    y: (view.transform.y * -1) + p1[1],
                    h: (p2[1]-p1[1]),
                    w: (p2[0]-p1[0])
                },{
                    x: nodePos[0] * view.transform.k,
                    y: nodePos[1] * view.transform.k,
                    h: node.editorNode.height * view.transform.k,
                    w: node.editorNode.width * view.transform.k
                })
            ) {
                this._editor.selected.list.push(node.editorNode);
            }
        }

        this._editor.view.update();
    }

}