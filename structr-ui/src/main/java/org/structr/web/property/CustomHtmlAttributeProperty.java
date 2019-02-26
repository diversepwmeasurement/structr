/**
 * Copyright (C) 2010-2019 Structr GmbH
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
package org.structr.web.property;

import org.structr.core.property.GenericProperty;
import org.structr.core.property.PropertyKey;

public class CustomHtmlAttributeProperty<T> extends GenericProperty<T> {

	public static final String CUSTOM_HTML_ATTRIBUTE_PREFIX = "_custom_html_";

	public CustomHtmlAttributeProperty(String name) {

		this(name, name);

	}

	public CustomHtmlAttributeProperty(String jsonName, String dbName) {

		super(jsonName, jsonName);

	}

	public CustomHtmlAttributeProperty(PropertyKey src) {

		this(src.jsonName(), src.dbName());

	}

	public String cleanName () {

		return jsonName().substring(CUSTOM_HTML_ATTRIBUTE_PREFIX.length());

	}
}
