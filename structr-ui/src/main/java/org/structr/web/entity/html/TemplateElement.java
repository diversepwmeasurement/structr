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
package org.structr.web.entity.html;

import jakarta.servlet.http.HttpServletRequest;
import org.structr.api.schema.JsonObjectType;
import org.structr.api.schema.JsonSchema;
import org.structr.schema.SchemaService;
import org.structr.web.entity.dom.DOMElement;

import java.net.URI;
import java.util.Arrays;
import java.util.Map.Entry;
import org.apache.commons.lang.StringUtils;
import org.structr.common.SecurityContext;
import org.structr.common.error.FrameworkException;
import org.structr.web.common.AsyncBuffer;
import org.structr.web.common.RenderContext;
import org.w3c.dom.Node;

public interface TemplateElement extends DOMElement {

	static class Impl { static {

		final JsonSchema schema   = SchemaService.getDynamicSchema();
		final JsonObjectType type = schema.addType("TemplateElement");

		type.setImplements(URI.create("https://structr.org/v1.1/definitions/TemplateElement"));
		type.setExtends(URI.create("#/definitions/DOMElement"));
		type.setCategory("html");

		type.overrideMethod("renderContent", false, TemplateElement.class.getName() + ".renderContent(this, arg0, arg1);");
	}}

	@Override
	default void renderManagedAttributes(final AsyncBuffer out, final SecurityContext securityContext, final RenderContext renderContext) throws FrameworkException {

	}

	static void renderContent(final TemplateElement thisElement, final RenderContext renderContext, final int depth) throws FrameworkException {

		if (renderContext.isPartialRendering()) {

			// store request data in render context
			TemplateElement.handleRequestData(renderContext);

			// Skip the enclosing template element and render the first child instead
			final Node node = thisElement.getFirstChild();
			if (node != null && node instanceof DOMElement) {

				final DOMElement element = (DOMElement) node;

				// mark template root so it can render its UUID into the HTML
				renderContext.setTemplateRootId(element.getUuid());
				renderContext.setTemplateId(thisElement.getUuid());

				element.renderContent(renderContext, depth);
			}

		} else {

			// super.renderContent() for static methods
			DOMElement.renderContent(thisElement, renderContext, depth);
		}
	}

	// ----- private static methods -----
	private static void handleRequestData(final RenderContext renderContext) {

		final HttpServletRequest request = renderContext.getRequest();
		final String contentType         = request.getHeader("content-type");

		if (StringUtils.isEmpty(contentType)) {

			handleUnknownRequestData(renderContext);

		} else {

			handleJsonRequestData(renderContext);
		}
	}

	private static void handleJsonRequestData(final RenderContext renderContext) {

		try {
			final java.util.Map<String, java.lang.Object> map = (java.util.Map)gson.fromJson(renderContext.getRequest().getReader(), java.util.Map.class);
			for (final Entry<String, java.lang.Object> entry : map.entrySet()) {

				renderContext.setConstant(entry.getKey(), entry.getValue());
			}

		} catch (Throwable t) {

			t.printStackTrace();
		}
	}

	private static void handleUnknownRequestData(final RenderContext renderContext) {

		final java.util.Map<String, String[]> parameters = renderContext.getRequest().getParameterMap();

		for (final String key : parameters.keySet()) {

			if (StringUtils.isNotBlank(key)) {

				// We want to support both GET and POST here. A JSON payload in a POST request comes with an
				// empty value (""), and JSON in the key, whereas a GET request parameter is stored correctly
				// as a key-value pair.

				final String[] value = parameters.get(key);
				if (value.length == 1 && StringUtils.isBlank(value[0])) {

					// assume JSON
					final java.util.Map<String, java.lang.Object> map = (java.util.Map)gson.fromJson(key, java.util.Map.class);
					for (final Entry<String, java.lang.Object> entry : map.entrySet()) {

						renderContext.setConstant(entry.getKey(), entry.getValue());
					}

				} else {

					// assume GET with one or more values
					if (value.length == 1) {

						renderContext.setConstant(key, value[0]);

					} else {

						renderContext.setConstant(key, Arrays.asList(value));
					}
				}
			}
		}
	}
}
