/*
 * Copyright (C) 2010-2022 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

export class Frontend {

	constructor() {

		// Javascript event handlers are called with 'this' bound to the current target,
		// but we need 'this' to be the current class instances, so we create bound
		// functions that have 'this' bound to the class instance. This is necessary
		// because we must remove and re-add event handlers after a partial reload,
		// which is only possible with the exact same function instance..
		this.boundHandleGenericEvent = this.handleGenericEvent.bind(this);
		this.boundHandleDragStart    = this.handleDragStart.bind(this);
		this.boundHandleDragOver     = this.handleDragOver.bind(this);
		this.boundHandleFocus        = this.handleFocus.bind(this);
		this.boundHandleBlur         = this.handleBlur.bind(this);
		this.boundHandleDrag         = this.handleDrag.bind(this);
		this.boundHandleRender       = this.handleRender.bind(this);

		// variables
		this.eventListeners          = {};
		this.currentlyFocusedElement = '';
		this.timeout                 = -1;

		// init
		this.bindEvents();
	}

	resolveData(event, target) {

		let data     = target.dataset;
		let resolved = {};

		// active input fields with a name
		if (target.name && target.name.length > 0) {

			resolved[target.name] = this.resolveValue(target);
		}

		for (const key in data) {

			let value = data[key];
			if (!value) {
				continue;
			}

			let lastIndex = value.length - 1;

			if (value.indexOf('css(') === 0 && value[lastIndex] === ')') {

				// resolve CSS selector
				let selector = value.substring(4, lastIndex);
				let element  = document.querySelector(selector);

				if (element) {

					resolved[key] = this.resolveValue(element);
				}

			 } else if (value.indexOf('name(') === 0 && value[lastIndex] === ')') {

				// resolve input name in current page, support multiple elements with the same name
				let name     = value.substring(5, lastIndex);
				let elements = document.querySelectorAll(`input[name="${name}"]`);
				let values   = [];

				elements.forEach(element => {

					// special treatment for checkboxes / radio buttons
					let value = this.resolveValue(element);
					if (value === true) {

						if (element.value) {
							values.push(element.value);
						} else {
							values.push(true);
						}
					}
				});

				console.log({ name: name, elements: elements, values: values });

				switch (values.length) {
					case 0: break;
					case 1: resolved[key] = values[0]; break;
					default: resolved[key] = values; break;
				}

			} else if (value.indexOf('json(') === 0 && value[lastIndex] === ')') {

				let json = value.substring(5, lastIndex);
				resolved[key] = JSON.parse(json);

			} else if (value.indexOf('data(') === 0 && value[lastIndex] === ')') {

				// data() refers to the dataset of the datatransfer object in a drag and drop
				// event, maybe the name of the key needs some more thought..
				let data = event.dataTransfer.getData('application/json');
				resolved[key] = JSON.parse(data);

			} else {

				switch (key) {

					// do not resolve internal keys
					case 'structrId':
					case 'structrEvents':
					case 'structrReloadTarget':
						break;

					default:
						// just copy the value
						resolved[key] = data[key];
						break;
				}
			}
		}

		return resolved;
	}

	resolveValue(element) {

		if (element.nodeName === 'INPUT' && (element.type === 'checkbox' || element.type === 'radio')) {

			// input[type="checkbox"]
			return element.checked;

		} else if (element.nodeName === 'SELECT' && element.multiple) {

			// select[multiple]
			return [].map.call(element.selectedOptions, (e) => { return e.value; });

		} else {

			if (element.value.length) {

				// all other node types
				return element.value;
			}

			return null;
		}
	}

	resetValue(element) {

		if (element.nodeName === 'INPUT' && element.type === 'checkbox') {

			// input[type="checkbox"]
			element.checked = element.defaultChecked;

		} else {

			// all other node types
			element.value = element.defaultValue;
		}
	}

	handleResult(element, json, status) {

		switch (status) {

			case 200:
				this.handleSuccessResult(element, json.result, status);
				break;

			case 401:
			case 403:
				this.resetValue(element);
				this.fireEvent('forbidden', { target: element, data: json, status: status });
				break;

			case 404:
				this.resetValue(element);
				this.fireEvent('notfound', { target: element, data: json, status: status });
				break;

			case 400:
			case 422:
			case 500:
			case 503:
				this.resetValue(element);
				this.fireEvent('error', { target: element, data: json, status: status });
				break;
		}
	}

	handleSuccessResult(element, parameters, status) {

		// result is deprecated, use success here..
		this.fireEvent('result', { target: element, data: parameters, status: status });
		this.fireEvent('success', { target: element, data: parameters, status: status });

		if (element.dataset.structrReloadTarget) {

			let reloadTargets = element.dataset.structrReloadTarget;

			for (let reloadTarget of reloadTargets.split(',').map( t => t.trim() ).filter( t => t.length > 0 )) {

				if (reloadTarget.indexOf('url:') === 0) {

					let url     = reloadTarget.substring(4).replaceAll('{', '${');
					let replace = new Function('result', 'return `' + url + '`;');
					let value   = replace(parameters);

					window.location.href = value;

				} else if (reloadTarget.indexOf('css:') === 0) {

					let css = reloadTarget.substring(4);

					element.classList.add(css);

					window.setTimeout(() => {
						element.classList.remove(css);
					}, 1000);

				} else if (reloadTarget.indexOf('event:') === 0) {

					let event = reloadTarget.substring(6);

					element.dispatchEvent(new CustomEvent(event, { detail: { result: parameters, status: status } }));

				} else if (reloadTarget === 'none') {

					// do nothing
					return;

				} else {

					this.reloadPartial(reloadTarget, parameters, element);
				}
			}

		} else {

			// what should be the default?
			// Reload, or nothing?
			window.location.reload();
		}
	}

	handleError(element, error, status) {

		console.log(error);

		console.error({element, error, status});

		if (element) {
			this.resetValue(element);
		}

		this.fireEvent('error', { target: element, data: {}, status: status });
	}

	reloadPartial(selector, parameters, element, dontRebind) {

		let reloadTargets = document.querySelectorAll(selector);

		if (!reloadTargets.length) {
			console.log('Container with selector ' + selector + ' not found.');
			return;
		}

		for (let container of reloadTargets) {

			let data = container.dataset;
			let id   = data.structrId;

			if (!id || id.length !== 32) {

				console.log('Container with selector ' + selector + ' has no data-id attribute, will not be reloaded.');
				continue;
			}

			let base   = '/structr/html/' + id;
			let params = this.encodeRequestParameters(data, parameters);
			let uri    = base + params;

			fetch(uri, {
				method: 'GET',
				credentials: 'same-origin'
			}).then(response => {

				if (!response.ok) { throw { status: response.status, statusText: response.statusText } };
				return response.text();

			}).then(html => {

				let content = document.createElement('div');
				if (content) {
					content.insertAdjacentHTML('afterbegin', html);
					if (content && content.children && content.children.length) {
					container.replaceWith(content.children[0]);
					} else {
					container.replaceWith('');
					}
					container.dispatchEvent(new Event('structr-reload'));
				}

				// restore focus on selected element after partial reload
				// (but only if input field was actually reloaded!)
				if (this.focusId && this.focusTarget && this.focusName) {

					let restoreFocus = container.querySelector('*[name="' + this.focusName + '"][data-structr-id="' + this.focusId + '"][data-structr-target="' + this.focusTarget + '"]');
					if (restoreFocus) {

					if (restoreFocus.focus && typeof restoreFocus.focus === 'function') { restoreFocus.focus(); }
					if (restoreFocus.select && typeof restoreFocus.select === 'function') { restoreFocus.select(); }
					}
				}

				if (!dontRebind) {
					this.bindEvents();
				}

				// fire reloaded event
				this.fireEvent('reloaded', { target: element, data: parameters });

			}).catch(e => {
				this.handleError(element, e, {});
			});
		}
	}

	loadPartial(uri, container) {

		fetch(uri, {
			method: 'GET',
			credentials: 'same-origin'
		}).then(response => {
			if (!response.ok) { throw { status: response.status, statusText: response.statusText } };
			return response.text();
		}).then(html => {
			let content = document.createElement('div');
			if (content) {
				content.insertAdjacentHTML('afterbegin', html);
				if (content && content.children && content.children.length) {
					container.replaceWith(content.children[0]);
				} else {
					container.replaceWith('');
				}
			}
			this.bindEvents();

		}).catch(e => {
			this.handleError(container, e, {});
		});
	}

	/**
	 * Transforms, merges and encodes parameter sets from different objects. All key-value
	 * pairs from fromDataset that are prefixed with "request" are un-prefixed and copied into
	 * the result object. Then all pairs from the override object are copied into the result
	 * object as well. After that, all key-value pairs are URI-encoded and returned
	 *
	 * @param {type} fromDataset
	 * @param {type} override
	 * @returns {String} the URI-encoded objects
	 */
	encodeRequestParameters(fromDataset, override) {

		let params  = {};
		let current = '';

		// current object set?
		if (fromDataset.currentObjectId) {
			current = '/' + fromDataset.currentObjectId;
		}

		// copy all values prefixed with request (data-request-*)
		for (let key of Object.keys(fromDataset)) {

			if (key.indexOf('request') === 0) {

				let restoredRequestKey = key.substring(7);
				restoredRequestKey = restoredRequestKey.substring(0, 1).toLowerCase() + restoredRequestKey.substring(1);
				if (restoredRequestKey.length) {

					params[restoredRequestKey] = fromDataset[key];
				}
			}
		}

		// include render state to reconstruct state of repeaters and dynamic elements
		if (fromDataset.structrRenderState && fromDataset.structrRenderState.length > 0) {
			params['structr-encoded-render-state'] = fromDataset.structrRenderState;
		}

		if (override) {

			// copy all keys from override object into params
			for (let key of Object.keys(override)) {

				let value = override[key];
				if (value === '') {

					delete params[key];

				} else {

					params[key] = value;
				}
			}
		}

		if (params) {

			let result = [];

			for (let key of Object.keys(params)) {

				let value = params[key];
				result.push(key + '=' + encodeURIComponent(value));
			}

			if (result.length) {

				return current + '?' + result.join('&');
			}
		}

		return current;
	}

	handleGenericEvent(event) {

		// event handling defaults
		let preventDefault  = true;
		let stopPropagation = true;

		let target     = event.currentTarget;
		let data       = target.dataset;
		let id         = data.structrId;
		let delay      = 0;

		// adjust debounce delay if set
		if (data && data.structrOptions) {
			try {

				let options = JSON.parse(data.structrOptions);
				if (options) {

					if (options.delay) {
						delay = options.delay;
					}

					if (options.preventDefault !== undefined) { preventDefault = options.preventDefault; }
					if (options.stopPropagation !== undefined) { stopPropagation = options.stopPropagation; }
				}
			} catch (e) {
				console.error(e);
			}
		}

		// allow element to override preventDefault and stopPropagation
		if (preventDefault) { event.preventDefault(); }
		if (stopPropagation) { event.stopPropagation(); }

		if (this.timeout) {
			window.clearTimeout(this.timeout);
		}

		this.timeout = window.setTimeout(() => {

			// special handling for possible sort keys (can contain multiple values, separated by ,)
			let sortKey = this.getFirst(data.structrTarget);

			// special handling for frontend-only events (pagination, sorting)
			if (sortKey && data[sortKey]) {

				// The above condition is true when the dataset of an element contains a value with the same name as the
				// data-structr-target attribute. This is currently only true for pagination and sorting, where
				// data-structr-target="page" and data-page="1" (which comes from the backend), or
				// data-structr-target="sort" and data-sort="sortKeyName".

				this.handlePagination(event, target);

			} else if (id && id.length === 32) {

				this.fireEvent('start', { target: target, data: data, event: event });

				// server-side
				// store event type in htmlEvent property
				data.htmlEvent = event.type;

				fetch('/structr/rest/DOMElement/' + id + '/event', {
					body: JSON.stringify(this.resolveData(event, target)),
					method: 'post',
					credentials: 'same-origin'
				})

				.then(response => {
					return response.json().then(json => ({ json: json, status: response.status, statusText: response.statusText }))
				})
				.then(response => this.handleResult(target, response.json, response.status))
				.catch(error   => this.handleError(target, error, {}));
			}

		}, delay);
	}

	getFirst(csvString) {

		if (csvString && csvString.length) {

			let parts = csvString.split(',');
			return parts[0];
		}

		return csvString;
	}

	handlePagination(event, target) {

		//let target       = event.target;
		let data         = target.dataset;
		let selector     = data.structrTarget;
		let reloadTarget = data.structrReloadTarget;

		if (!selector) {
			console.log('Selector not found: ' + selector);
			console.log(target);
			console.log(data);
		 	return;
		}

		let parameters = {};
		let parts      = selector.split(',');
		let sortKey    = selector;
		let orderKey   = 'descending';

		// parse optional order key (default is "descending")
		if (parts.length > 1) {

			sortKey  = parts[0].trim();
			orderKey = parts[1].trim();
		}

		let resolved        = this.resolveData(event, target);
		parameters[sortKey] = resolved[sortKey];

		let reloadTargets = document.querySelectorAll(reloadTarget);
		if (reloadTargets.length) {

			let sortContainer = reloadTargets[0];
			let sortValue     = sortContainer.getAttribute('data-request-' + sortKey);
			let orderValue    = sortContainer.getAttribute('data-request-' + orderKey);

			if (sortValue === resolved[sortKey]) {

				// The values need to be strings because we're
				// parsing them from the request query string.
				if (!orderValue || orderValue === 'false') {

					parameters[orderKey] = 'true';

				} else {

					parameters[orderKey] = '';
				}
			}
		}

		this.handleResult(target, { result: parameters }, 200);
	}

	parseQueryString(query) {

		let result = {};

		if (query?.length <= 0) {
			return result;
		}

		for (let part of query.substring(1).split('&')) {

			let keyvalue = part.split('=');
			let key      = keyvalue[0];
			let value    = keyvalue[1];

			if (key && value) {

				result[key] = value;
			}
		}

		return result;
	}

	handleDragStart(event) {

		event.stopPropagation();

		let data = this.resolveData(event, event.currentTarget.dataset);

		// store UUID of structr node explicitly for drag and drop
		data.id = event.currentTarget.dataset.structrTarget;

		// initialize dataTransfer object
		event.dataTransfer.setData("application/json", JSON.stringify(data));
		event.dataTransfer.dropEffect = "move";
	}

	handleDragOver(event) {
		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer.dropEffect = "move";
	}

	handleDrag(event) {
		event.preventDefault();
		event.stopPropagation();
	}

	handleFocus(event) {
		this.focusTarget = event.currentTarget.dataset.structrTarget;
		this.focusId     = event.currentTarget.dataset.structrId;
		this.focusName   = event.currentTarget.name;
	}

	handleBlur(event) {
		this.focusTarget = undefined;
		this.focusName   = undefined;
		this.focusId     = undefined;
	}

	handleRender(el) {
		const id = el.dataset.structrId;
		this.reloadPartial('[data-structr-id="' + id + '"]', null, el, true);
	}

	bindEvents() {

		document.querySelectorAll('*[data-structr-rendering-mode]').forEach(elem => {

			let renderingMode   = elem.dataset.structrRenderingMode;
			let delayOrInterval = elem.dataset.structrDelayOrInterval;
			if (renderingMode.length) {
				this.attachRenderingHandler(elem, this.boundHandleRender, renderingMode, delayOrInterval);
			}
		});

		document.querySelectorAll('*[data-structr-events]').forEach(elem => {

			let source = elem.dataset.structrEvents;
			if (source) {

				let mapping = source.split(",");
				for (let event of mapping) {

					elem.removeEventListener(event, this.boundHandleGenericEvent);
					elem.addEventListener(event, this.boundHandleGenericEvent);

					// add event listeners to support drag and drop
					if (event === 'drop') {

						elem.removeEventListener('dragstart', this.boundHandleDragStart);
						elem.removeEventListener('dragover',  this.boundHandleDragOver);
						elem.removeEventListener('drag',      this.boundHandleDrag);

						elem.addEventListener('dragstart', this.boundHandleDragStart);
						elem.addEventListener('dragover',  this.boundHandleDragOver);
						elem.addEventListener('drag',      this.boundHandleDrag);
					}
				}
			}

			if (elem.dataset.structrId && elem.dataset.structrTarget && elem.name) {

				// capture focus
				elem.removeEventListener('focus', this.boundHandleFocus);
				elem.addEventListener('focus', this.boundHandleFocus);

				// capture blur
				elem.removeEventListener('blur', this.boundHandleBlur);
				elem.addEventListener('blur', this.boundHandleBlur);
			}
		});
	}

	addEventListener(name, listener) {

		if (!this.eventListeners[name]) {
			this.eventListeners[name] = [];
		}

		this.eventListeners[name].push(listener);
	}

	removeEventListener(name, listener) {

		if (this.eventListeners[name]) {

			let listeners = this.eventListeners[name];

			if (listeners && listeners.length > 0) {

				listener.splice(listeners.indexOf(listener), 1);
			}
		}
	}

	fireEvent(name, data) {

		if (this.eventListeners[name]) {

			let listeners = this.eventListeners[name];

			for (let listener of listeners) {

				listener.apply(null, [data]);
			}
		}
	}

	attachRenderingHandler(element, callback, renderingMode, delayOrInterval) {

		switch (renderingMode) {

			case 'load':
				callback(element);
				break;

			case 'delayed':

				window.setTimeout(() => {
					callback(element);
				}, delayOrInterval|| 1000);
				break;

			case 'visible':

				const observer = new IntersectionObserver((entries, observer) => {
					entries.forEach(entry => {
						if (entry.isIntersecting) {
							callback(element, observer);
						}
					});
				});

				observer.observe(element);

				break;

			case 'periodic':

				callback(element);
				window.setInterval(() => {
					callback(element);
				}, delayOrInterval|| 10000);
				break;

			default:
				callback(element);
				break;
		}

	}
}

window.structrFrontendModule = new Frontend();
