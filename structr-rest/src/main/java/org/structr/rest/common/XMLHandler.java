/**
 * Copyright (C) 2010-2017 Structr GmbH
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
package org.structr.rest.common;

import java.io.Reader;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.events.Attribute;
import javax.xml.stream.events.Characters;
import javax.xml.stream.events.EndElement;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Christian Morgner
 */
public class XMLHandler implements Iterator<Map<String, Object>> {

	private static final Logger logger = LoggerFactory.getLogger(XMLHandler.class);

	public static final String ACTION        = "action";
	public static final String CONTENT       = "content";
	public static final String ISROOT        = "isRoot";
	public static final String MULTIPLICITY  = "multiplicity";
	public static final String PROPERTIES    = "properties";
	public static final String PROPERTY_NAME = "propertyName";
	public static final String ROOT_ELEMENT  = "root";
	public static final String SKIP_ELEMENTS = "ignore";
	public static final String TARGET_TYPE   = "targetType";
	public static final String TYPE_MAPPING  = "types";
	public static final String TYPE          = "type";

	private final Map<String, Object> configuration = new LinkedHashMap<>();
	private Map<String, Object> nextElement         = null;
	private XMLInputFactory factory                 = null;
	private XMLEventReader reader                   = null;
	private Element current                         = null;

	public XMLHandler(final Map<String, Object> configuration, final Reader input) throws XMLStreamException {

		this.configuration.putAll(configuration);
		this.factory = XMLInputFactory.newInstance();

		// disable DTD referencing, namespaces etc
		factory.setProperty(XMLInputFactory.SUPPORT_DTD, Boolean.FALSE);
		factory.setProperty(XMLInputFactory.IS_VALIDATING, Boolean.FALSE);
		factory.setProperty(XMLInputFactory.IS_REPLACING_ENTITY_REFERENCES, Boolean.FALSE);
		factory.setProperty(XMLInputFactory.IS_NAMESPACE_AWARE, Boolean.FALSE);
		factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, Boolean.FALSE);

		// create XML reader
		this.reader  = factory.createXMLEventReader(input);
	}

	public void startDocument() {
	}

	public void endDocument() {

	}

	public void startElement(final StartElement element) {

		final String tagName = element.getName().toString();

		// collect attributes
		if (configuration.containsKey(tagName)) {

			final Map<String, Object> typeHandler = (Map)configuration.get(tagName);
			final Map<String, Object> properties  = (Map)typeHandler.get(PROPERTIES);
			final Object isRoot                   = typeHandler.get(ISROOT);

			// check for root tag first, do not import otherwise
			if (current == null && !"true".equals(isRoot) && !Boolean.TRUE.equals(isRoot)) {
				return;
			}

			final Map<String, Object> data = new LinkedHashMap<>();

			for (final Iterator it = element.getAttributes(); it.hasNext();) {

				final Object attr = it.next();

				if (attr instanceof Attribute) {

					final Attribute attribute = (Attribute)attr;
					final String name         = attribute.getName().toString();
					final String value        = attribute.getValue();

					if (properties != null && properties.containsKey(name))  {

						final String mappedName = (String)properties.get(name);
						data.put(mappedName, value);

					} else {

						data.put(name, value);
					}
				}
			}

			current = new Element(current, tagName);
			current.setData(data);
		}
	}

	public void endElement(final EndElement element) {

		if (current != null) {

			final String tagName = element.getName().toString();
			if (configuration.containsKey(tagName)) {

				if (current.parent == null) {

					// object is complete, can be created
					handleObject(current);
				}

				// one level up
				current = current.parent;
			}
		}
	}

	public void characters(final Characters text) {

		if (current != null && !text.isIgnorableWhiteSpace() && !text.isWhiteSpace()) {

			current.setText(text.getData());
		}

	}

	// ----- private methods -----
	private void handleObject(final Element element) {

		nextElement = new LinkedHashMap<>();

		convertAndTransform(element, nextElement);
	}

	private void convertAndTransform(final Element element, final Map<String, Object> entityData) {

		final Map<String, Object> config = (Map)configuration.get(element.tagName);
		if (config != null) {

			final String action = (String)config.get(ACTION);
			if (action != null) {

				switch (action) {

					case "createNode":
						handleCreateNode(element, entityData, config);
						break;

					case "createRelationship":
						handleCreateRelationship(element, entityData, config);
						break;

					case "setProperty":
						handleSetProperty(element, entityData, config);
						break;

					case "ignore":
						break;
				}

			} else {

				System.out.println("No action for tag " + element.tagName + ", ignoring");
			}

		} else {

			System.out.println("No config for tag " + element.tagName + ", ignoring");

		}
	}

	private void handleCreateNode(final Element element, final Map<String, Object> entityData, final Map<String, Object> config) {

		// copy and transform entity data into
		final String type = (String)config.get(TYPE);
		if (type != null) {

			if (element.parent != null) {

				final String propertyName = (String)config.get(PROPERTY_NAME);
				if (propertyName != null) {

					final Map<String, Object> childData = new LinkedHashMap<>();

					if ("1".equals(config.get(MULTIPLICITY))) {

						// handle data for nested child element
						entityData.put(propertyName, childData);

						childData.put(TYPE, type);
						childData.putAll(element.data);

						for (final Element child : element.children) {

							convertAndTransform(child, childData);
						}

					} else {

						List<Map<String, Object>> elements = (List)entityData.get(propertyName);
						if (elements == null) {

							elements = new LinkedList<>();
							entityData.put(propertyName, elements);
						}

						// add element to collection
						elements.add(childData);

						for (final Element child : element.children) {

							childData.put(TYPE, type);
							childData.putAll(child.data);

							convertAndTransform(child, childData);
						}
					}

					if (element.text != null) {

						// store content if present
						String contentName = (String)config.get(CONTENT);
						if (contentName == null) {

							contentName = "content";
						}

						childData.put(contentName, element.text);
					}

				} else {

					System.out.println("Missing property name for nested createNode action in " + element.tagName);
				}

			} else {

				// handle data for toplevel element
				entityData.put(TYPE, type);
				entityData.putAll(element.data);

				for (final Element child : element.children) {

					convertAndTransform(child, entityData);
				}
			}

		} else {

			System.out.println("Invalid import specification for " + element.tagName + ", createNode action must be accompanied by type attribute.");
		}
	}

	private void handleCreateRelationship(final Element element, final Map<String, Object> entityData, final Map<String, Object> config) {

		// copy and transform entity data into
		final String propertyName = (String)config.get(PROPERTY_NAME);
		if (propertyName != null) {

			List<Map<String, Object>> elements = (List)entityData.get(propertyName);
			if (elements == null) {

				elements = new LinkedList<>();
				entityData.put(propertyName, elements);
			}

			final Map<String, Object> childData = new LinkedHashMap<>();
			elements.add(childData);

			for (final Element child : element.children) {

				convertAndTransform(child, childData);
			}

		} else {

			System.out.println("Invalid import specification for " + element.tagName + ", createNode action must be accompanied by type attribute.");
		}
	}

	/**
	 * The setProperty action will not descend further into the collection
	 * of children, but will instead evaluate a transformation expression.
	 *
	 * @param element element
	 * @param entityData parent's entity data
	 * @param config type configuration
	 */
	private void handleSetProperty(final Element element, final Map<String, Object> entityData, final Map<String, Object> config) {

		String propertyName = (String)config.get(PROPERTY_NAME);
		if (propertyName == null) {

			propertyName = element.tagName;
		}

		entityData.put(propertyName, element.text);
	}

	// ----- nested classes -----
	private class Element {

		private List<Element> children   = new LinkedList<>();
		private Map<String, Object> data = null;
		private Element parent           = null;
		private String tagName           = null;
		private String text              = null;

		public Element(final Element parent, final String tagName) {
			this.parent  = parent;
			this.tagName = tagName;

			if (parent != null) {
				parent.children.add(this);
			}
		}

		public void setData(final Map<String, Object> data) {
			this.data = data;
		}

		public void setText(final String text) {
			this.text = text;
		}
	}

	// ----- interface Iterator<JsonInput> -----
	@Override
	public boolean hasNext() {

		// iterate over input data until an element is created
		while (reader.hasNext() && nextElement == null) {

			try {
				final XMLEvent event = reader.nextEvent();

				switch (event.getEventType()) {

					case XMLEvent.START_DOCUMENT:
						startDocument();
						break;

					case XMLEvent.START_ELEMENT:
						startElement(event.asStartElement());
						break;

					case XMLEvent.END_DOCUMENT:
						endDocument();
						break;

					case XMLEvent.END_ELEMENT:
						endElement(event.asEndElement());
						break;

					case XMLEvent.CHARACTERS:
						characters(event.asCharacters());
						break;
				}

			} catch (XMLStreamException strex) {
				logger.warn(strex.getMessage());
			}
		}

		// either an element has been created, or the stream is at its end
		return nextElement != null;
	}

	@Override
	public Map<String, Object> next() {

		// transfer reference
		final Map<String, Object> result = nextElement;

		// reset local reference
		nextElement = null;

		// return transferred reference
		return result;
	}
}
