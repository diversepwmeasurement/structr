/*
 * Copyright (C) 2010-2021 Structr GmbH
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
$(document).ready(function() {
	Structr.registerModule(_MailTemplates);
});

let _MailTemplates = {
	_moduleName: 'mail-templates',

	mailTemplatesPager: undefined,
	mailTemplatesList: undefined,
	mailTemplateDetail: undefined,
	mailTemplateDetailForm: undefined,
	previewElement: undefined,
	editor: undefined,

	mailTemplatesResizerLeftKey: 'structrMailTemplatesResizerLeftKey_' + port,
	mailTemplateSelectedElementKey: 'structrMailTemplatesSelectedElementKey_' + port,

	init: function() {},
	unload: function() {},
	onload: function() {

		Structr.updateMainHelpLink(Structr.getDocumentationURLForTopic('mail-templates'));

		Structr.fetchHtmlTemplate('mail-templates/main', {}, function(html) {
			main.append(html);

			Structr.fetchHtmlTemplate('mail-templates/functions', {}, function (html) {
				functionBar.append(html);

				let namePreselect = document.getElementById('mail-template-name-preselect');

				document.getElementById('create-mail-template-form').addEventListener('submit', (e) => {
					e.preventDefault();

					_MailTemplates.showMain();
					_MailTemplates.createObject('MailTemplate', { name: namePreselect.value }, this, (data) => {
						let id = data.result[0];
						_MailTemplates.showMailTemplateDetails(id, true);
					});
				});

				_MailTemplates.mailTemplatesList = $('#mail-templates-table tbody');
				_MailTemplates.listMailTemplates();

				_MailTemplates.mailTemplateDetail = $('#mail-template-detail');
				_MailTemplates.mailTemplateDetailForm = $('#mail-template-detail-form');
				_MailTemplates.previewElement = document.getElementById('mail-template-preview');

				document.querySelector('#mail-templates-detail-container button.save').addEventListener('click', function() {

					let data = _MailTemplates.getObjectDataFromElement(_MailTemplates.mailTemplateDetailForm);
					let id   = _MailTemplates.mailTemplateDetailForm.data('mail-template-id');

					_MailTemplates.updateObject('MailTemplate', id, data, this, null, function() {

						let rowInList = $('#mail-template-' + id, _MailTemplates.mailTemplatesList);
						_MailTemplates.populateMailTemplatePagerRow(rowInList, data);
						_MailTemplates.updatePreview();
					});
				});

				Structr.unblockMenu(100);

				Structr.initVerticalSlider($('.column-resizer', main), _MailTemplates.mailTemplatesResizerLeftKey, 300, _MailTemplates.moveResizer);

				_MailTemplates.moveResizer(LSWrapper.getItem(_MailTemplates.mailTemplatesResizerLeftKey));
			});
		});
	},
	getContextMenuElements: function (div, entity) {

		let elements = [];

		elements.push({
			name: 'Properties',
			clickHandler: function() {
				_Entities.showProperties(entity, 'ui');
				return false;
			}
		});

		_Elements.appendContextMenuSeparator(elements);

		_Elements.appendSecurityContextMenuItems(elements, entity);

		_Elements.appendContextMenuSeparator(elements);

		elements.push({
			icon: _Icons.svg.trashcan,
			classes: ['menu-bolder', 'danger'],
			name: 'Delete Mail Template',
			clickHandler: () => {

				_Entities.deleteNode(this, entity, false, () => {

					let lastSelectedMailTemplateId = LSWrapper.getItem(_MailTemplates.mailTemplateSelectedElementKey);
					if (lastSelectedMailTemplateId === entity.id) {
						LSWrapper.removeItem(_MailTemplates.mailTemplateSelectedElementKey);
						document.getElementById('mail-templates-detail-container').style.display = 'none';
					}

					_MailTemplates.mailTemplatesPager.refresh();

					let row = Structr.node(entity.id, '#mail-template-');
					if (row) {
						row.remove();
						_MailTemplates.checkMainVisibility();
					}
				});
				return false;
			}
		});

		_Elements.appendContextMenuSeparator(elements);

		return elements;
	},
	showMain: () => {
		document.getElementById('mail-templates-main').style.display = 'flex';
		_MailTemplates.moveResizer();
	},
	hideMain: () => {
		document.getElementById('mail-templates-main').style.display = 'none';
	},
	checkMainVisibility: () => {

		let rows = document.querySelectorAll('.mail-template-row');
		let selectedRowExists = false;
		rows.forEach((row) => {
			selectedRowExists |= row.classList.contains('selected');
		});

		if (!rows || rows.length === 0) {
			_MailTemplates.hideMain();
		} else if (!selectedRowExists) {
			document.getElementById('mail-templates-detail-container').style.display = 'none';
		}
	},
	resize: function() {

		_MailTemplates.moveResizer();
		Structr.resize();
	},
	moveResizer: function(left) {

		requestAnimationFrame(() => {

			left = left || LSWrapper.getItem(_MailTemplates.mailTemplatesResizerLeftKey) || 300;
			left = Math.max(300, Math.min(left, window.innerWidth - 300));

			document.querySelector('.column-resizer').style.left = left + 'px';

			let listContainer = document.getElementById('mail-templates-list-container');
			listContainer.style.width = 'calc(' + left + 'px - 1rem)';

			let detailContainer = document.getElementById('mail-templates-detail-container');
			detailContainer.style.width = 'calc(100% - ' + left + 'px - 3rem)';

			return true;
		});
	},
	updatePreview: () => {

		//_MailTemplates.previewElement.contentDocument.open();
		let value = _MailTemplates.editor ? _MailTemplates.editor.getValue() : document.getElementById('mail-template-text').value;
		//_MailTemplates.previewElement.contentDocument.write(value);
		_MailTemplates.previewElement.contentDocument.documentElement.innerHTML = value;
		//_MailTemplates.previewElement.contentDocument.close();
	},
	listMailTemplates: () => {

		let pagerEl = $('#mail-templates-pager');

		_Pager.initPager('mail-templates', 'MailTemplate', 1, 25, 'name', 'asc');

		_MailTemplates.mailTemplatesPager = _Pager.addPager('mail-templates', pagerEl, false, 'MailTemplate', 'ui', _MailTemplates.processPagerData);

		_MailTemplates.mailTemplatesPager.cleanupFunction = function () {
			fastRemoveAllChildren(_MailTemplates.mailTemplatesList[0]);
		};
		_MailTemplates.mailTemplatesPager.pager.append('Filters: <input type="text" class="filter w100 mail-template-name" data-attribute="name" placeholder="Name" />');
		_MailTemplates.mailTemplatesPager.pager.append('<input type="text" class="filter w100 mail-template-locale" data-attribute="locale" placeholder="Locale" />');
		_MailTemplates.mailTemplatesPager.activateFilterElements();

		pagerEl.append('<div style="clear:both;"></div>');
	},
	processPagerData: (pagerData) => {
		if (pagerData && pagerData.length) {
			pagerData.forEach(_MailTemplates.appendMailTemplate);
		}
	},
	appendMailTemplate: (mailTemplate) => {

		_MailTemplates.showMain();

		Structr.fetchHtmlTemplate('mail-templates/row.type', { mailTemplate: mailTemplate }, function(html) {

			let row = $(html);

			_MailTemplates.populateMailTemplatePagerRow(row, mailTemplate);
			_MailTemplates.mailTemplatesList.append(row);

			let actionsCol = $('.actions', row);

			row.on('click', function () {
				_MailTemplates.selectRow(mailTemplate.id);
				_MailTemplates.showMailTemplateDetails(mailTemplate.id);
			});

			_Elements.enableContextMenuOnElement(row, mailTemplate);
			_Entities.appendEditPropertiesIcon(actionsCol, mailTemplate, true);

			let lastSelectedMailTemplateId = LSWrapper.getItem(_MailTemplates.mailTemplateSelectedElementKey);
			if (lastSelectedMailTemplateId === mailTemplate.id) {
				row.click();
			}
		});
	},
	selectRow: (id) => {

		document.querySelectorAll('.mail-template-row').forEach((row) => {
			row.classList.remove('selected');
		});

		document.getElementById('mail-template-' + id).classList.add('selected');
	},
	populateMailTemplatePagerRow: (row, mailTemplate) => {

		$('.property', row).each(function(i, el) {
			var self = $(this);
			var val = mailTemplate[self.attr('data-property')];
			self.text(val !== null ? val : "");
		});

	},
	getObjectDataFromElement: function(element) {
		var data = {};

		if (_MailTemplates.editor) {
			_MailTemplates.editor.toTextArea();
		}

		$('.property', element).each(function(idx, el) {
			var el = $(el);

			if (el.attr('type') === 'checkbox') {
				data[el.data('property')] = el.prop('checked');
			} else {
				var val = el.val();
				if (val === "") {
					val = null;
				}
				data[el.data('property')] = val;
			}
		});

		_MailTemplates.activateEditor();

		return data;
	},
	showMailTemplateDetails: function(mailTemplateId, isCreate) {

		Command.get(mailTemplateId, '', function(mt) {

			document.getElementById('mail-templates-detail-container').style.display = null;

			_MailTemplates.mailTemplateDetailForm.data('mail-template-id', mailTemplateId);

			LSWrapper.setItem(_MailTemplates.mailTemplateSelectedElementKey, mailTemplateId);

			if (_MailTemplates.editor) {
				_MailTemplates.editor.toTextArea();
			}

			$('.property', _MailTemplates.mailTemplateDetailForm).each(function(idx, el) {
				var el = $(el);
				var val = mt[el.data('property')];

				if (el.attr('type') === 'checkbox') {
					el.prop('checked', (val === true));
				} else {
					el.val(val);
				}
			});

			_MailTemplates.activateEditor();
			_MailTemplates.updatePreview();

			if (isCreate === true) {
				_MailTemplates.mailTemplatesPager.refresh();
			}
		});
	},
	activateEditor: () => {

		let templateContentTextarea = document.getElementById('mail-template-text');
		_MailTemplates.editor = CodeMirror.fromTextArea(templateContentTextarea, Structr.getCodeMirrorSettings({
			lineNumbers: true,
			lineWrapping: false,
			indentUnit: 4,
			tabSize: 4,
			indentWithTabs: false
		}));
	},
	createObject: async (type, data, element, successCallback) => {

		let response = await fetch(rootUrl + type, {
			method: 'POST',
			body: JSON.stringify(data)
		});

		if (response.ok) {

			let data = await response.json();

			blinkGreen($('td', element));

			if (typeof successCallback === "function") {
				successCallback(data);
			}

		} else {
			blinkRed($('td', element));
		}
	},
	updateObject: async (type, id, newData, $el, $blinkTarget, successCallback) => {

		let response = await fetch(rootUrl + type + '/' + id, {
			method: 'PUT',
			body: JSON.stringify(newData)
		});

		if (response.ok) {

			blinkGreen(($blinkTarget ? $blinkTarget : $el));

			if (typeof successCallback === "function") {
				successCallback();
			}

		} else {
			blinkRed(($blinkTarget ? $blinkTarget : $el));
		}
	}
};