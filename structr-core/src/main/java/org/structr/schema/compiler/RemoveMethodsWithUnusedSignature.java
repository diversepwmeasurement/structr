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
package org.structr.schema.compiler;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.structr.common.error.ErrorToken;
import org.structr.common.error.FrameworkException;
import org.structr.core.app.App;
import org.structr.core.app.StructrApp;
import org.structr.core.entity.SchemaMethod;
import org.structr.core.entity.SchemaNode;
import org.structr.core.graph.Tx;

/**
 * A migration handler that removes old methods which signature is already
 * defined in a another class.
 */
public class RemoveMethodsWithUnusedSignature implements MigrationHandler {

	//                                                                 name              signature                                          type
	private static final Pattern PATTERN = Pattern.compile("method ([a-zA-Z0-9_]+)\\(([a-zA-Z0-9_ \\.,<>]*)\\) is already defined in class ([a-zA-Z0-9\\.]+)");
	private static final Logger logger   = LoggerFactory.getLogger(RemoveMethodsWithUnusedSignature.class);

	@Override
	public void handleMigration(final ErrorToken errorToken) throws FrameworkException {

		final String type   = errorToken.getType();
		final String token  = errorToken.getToken();
		final String detail = (String)errorToken.getDetail();

		if ("compiler_error".equals(token)) {

			// check error detail
			final Matcher matcher = PATTERN.matcher(detail);
			if (matcher.matches()) {

				try {

					final App app = StructrApp.getInstance();

					// extract info
					final String methodName = matcher.group(1);
					final String signature  = matcher.group(2);
					final String fqcn       = matcher.group(3);

					try (final Tx tx = app.tx()) {

						SchemaNode schemaNode = app.nodeQuery(SchemaNode.class).andName(type).getFirst();

						if (schemaNode == null) {

							schemaNode = app.nodeQuery(SchemaNode.class).andName(fqcn.substring(fqcn.lastIndexOf(".") + 1)).getFirst();
						}

						if (schemaNode != null) {

							for (final SchemaMethod method : app.nodeQuery(SchemaMethod.class)
								.and(SchemaMethod.schemaNode, schemaNode)
								.and(SchemaMethod.name,       methodName)
								.getAsList()) {

								app.delete(method);
							}
						}

						tx.success();

					} catch (FrameworkException fex) {
						logger.warn("Unable to correct schema compilation error: {}", fex.getMessage());
					}

				} catch (ArrayIndexOutOfBoundsException ibex) {
					logger.warn("Unable to extract error information from {}: {}", detail, ibex.getMessage());
				}
			}
		}
	}
}