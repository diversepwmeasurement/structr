/*
 * Copyright (C) 2010-2020 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.structr.common;

import org.structr.common.error.FrameworkException;
import org.structr.core.GraphObject;
import org.structr.core.property.PropertyKey;
import org.structr.schema.Transformer;

/**
 */
public class LowercaseTransformator implements Transformer<String> {

	@Override
	public String getProperty(final GraphObject entity, final PropertyKey<String> key, final String value) {

		if (value != null) {
			return value.toLowerCase();
		}

		return null;
	}

	@Override
	public String setProperty(final GraphObject entity, final PropertyKey<String> key, final String value) throws FrameworkException {

		if (value != null) {

			return value.toLowerCase();
		}

		return null;
	}
}
