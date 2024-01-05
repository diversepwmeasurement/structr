/*
 * Copyright (C) 2010-2024 Structr GmbH
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
package org.structr.websocket.command;

import org.structr.common.PropertyView;
import org.structr.common.error.FrameworkException;
import org.structr.core.GraphObject;
import org.structr.core.GraphObjectMap;
import org.structr.core.app.StructrApp;
import org.structr.core.entity.AbstractNode;
import org.structr.core.entity.GenericNode;
import org.structr.core.entity.SchemaProperty;
import org.structr.core.entity.SchemaRelationshipNode;
import org.structr.core.property.BooleanProperty;
import org.structr.core.property.GenericProperty;
import org.structr.core.property.Property;
import org.structr.core.property.PropertyKey;
import org.structr.schema.ConfigurationProvider;
import org.structr.websocket.StructrWebSocket;
import org.structr.websocket.message.MessageBuilder;
import org.structr.websocket.message.WebSocketMessage;

import java.util.LinkedList;
import java.util.List;
import java.util.Set;

/**
 * Websocket command to return the properties of a given schema entity.
 */
public class ListSchemaPropertiesCommand extends AbstractCommand {

	private static final Property<Boolean> isSelected = new BooleanProperty("isSelected");
	private static final Property<Boolean> isDisabled = new BooleanProperty("isDisabled");

	static {

		StructrWebSocket.addCommand(ListSchemaPropertiesCommand.class);

	}

	@Override
	public void processMessage(final WebSocketMessage webSocketData) {

		setDoTransactionNotifications(false);

		final String view              = webSocketData.getNodeDataStringValue("view");
		final String id                = webSocketData.getId();
		final List<GraphObject> result = new LinkedList();

		if (view != null) {

			if (id != null) {

				AbstractNode schemaObject = getNode(id);
				if (schemaObject != null) {

					final ConfigurationProvider config = StructrApp.getConfiguration();
					String typeName              = schemaObject.getProperty(AbstractNode.name);

					if (typeName == null && schemaObject instanceof SchemaRelationshipNode) {
						typeName = ((SchemaRelationshipNode) schemaObject).getClassName();
					}

					Class type = config.getNodeEntityClass(typeName);
					if (type == null || GenericNode.class.equals(type)) {

						type = config.getRelationshipEntityClass(typeName);
					}

					if (type != null) {

						final Set<PropertyKey> allProperties    = config.getPropertySet(type, PropertyView.All);
						final Set<PropertyKey> viewProperties   = config.getPropertySet(type, view);
						final Set<PropertyKey> parentProperties = config.getPropertySet(type.getSuperclass(), view);

						for (final PropertyKey key : allProperties) {

							final String declaringClass   = key.getDeclaringClass() != null ? key.getDeclaringClass().getSimpleName() : "GraphObject";
							final String declaringUuid    = key.getSourceUuid();
							final String propertyName     = key.jsonName();
							final GraphObjectMap property = new GraphObjectMap();
							final Class valueType         = key.valueType();
							String valueTypeName          = "Unknown";
							boolean _isDisabled           = false;

							if (valueType != null) {
								valueTypeName = valueType.getSimpleName();
							}

							property.put(AbstractNode.id, key.getSourceUuid());
							property.put(AbstractNode.name, propertyName);
							property.put(isSelected, viewProperties.contains(key));
							property.put(isDisabled, _isDisabled);
							property.put(SchemaProperty.propertyType, valueTypeName);
							property.put(SchemaProperty.notNull, key.isNotNull());
							property.put(SchemaProperty.unique, key.isUnique());
							property.put(SchemaProperty.isPartOfBuiltInSchema, key.isPartOfBuiltInSchema());
							property.put(SchemaProperty.isDynamic, key.isDynamic());
							property.put(SchemaProperty.declaringClass, declaringClass);
							property.put(SchemaProperty.declaringUuid, declaringUuid);

							if (declaringUuid != null) {

								try {

									final GraphObject declaringEntity = StructrApp.getInstance().get(AbstractNode.class, declaringUuid);
									if (declaringEntity != null) {

										if (declaringEntity instanceof SchemaProperty) {

											final SchemaProperty schemaProperty = (SchemaProperty) declaringEntity;
											property.put(new GenericProperty("declaringPropertyType"), schemaProperty.getPropertyType().name());
										}
									}

								} catch (FrameworkException ignore) {}
							}

							// store in result
							result.add(property);
						}

					} else {

						getWebSocket().send(MessageBuilder.status().code(404).message("Type " + typeName + " not found.").build(), true);
					}

				} else {

					getWebSocket().send(MessageBuilder.status().code(404).message("Schema node with ID " + id + " not found.").build(), true);
				}

			} else {

				getWebSocket().send(MessageBuilder.status().code(422).message("LIST_SCHEMA_PROPERTIES needs an ID.").build(), true);
			}

		} else {

			getWebSocket().send(MessageBuilder.status().code(422).message("LIST_SCHEMA_PROPERTIES needs a view name in nodeData.").build(), true);
		}

		webSocketData.setView(PropertyView.Ui);
		webSocketData.setResult(result);
		webSocketData.setRawResultCount(1);

		// send only over local connection
		getWebSocket().send(webSocketData, true);

	}

	@Override
	public String getCommand() {

		return "LIST_SCHEMA_PROPERTIES";

	}

}
