/**
 * Copyright (C) 2010-2018 Structr GmbH
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
package org.structr.web.entity;


import java.io.IOException;
import java.net.URI;
import java.util.List;
import org.structr.api.config.Settings;
import org.structr.common.PropertyView;
import org.structr.common.SecurityContext;
import org.structr.common.error.ErrorBuffer;
import org.structr.common.error.FrameworkException;
import org.structr.common.error.UniqueToken;
import org.structr.core.app.StructrApp;
import org.structr.core.entity.AbstractNode;
import org.structr.core.entity.LinkedTreeNode;
import org.structr.core.entity.Relation;
import org.structr.core.entity.Relation.Cardinality;
import org.structr.core.property.PropertyKey;
import org.structr.schema.SchemaService;
import org.structr.schema.json.JsonObjectType;
import org.structr.schema.json.JsonReferenceType;
import org.structr.schema.json.JsonSchema;
import org.structr.web.common.FileHelper;
import org.structr.web.property.PathProperty;

/**
 * Base class for filesystem objects in structr.
 */
public interface AbstractFile extends LinkedTreeNode<AbstractFile> {

	static class Impl { static {

		final JsonSchema schema     = SchemaService.getDynamicSchema();
		final JsonObjectType folder = (JsonObjectType)schema.addType("Folder");
		final JsonObjectType type   = schema.addType("AbstractFile");

		type.setIsAbstract();
		type.setImplements(URI.create("https://structr.org/v1.1/definitions/AbstractFile"));
		type.setExtends(URI.create("https://structr.org/v1.1/definitions/LinkedTreeNodeImpl?typeParameters=org.structr.web.entity.AbstractFile"));

		type.addStringProperty("name", PropertyView.Public).setRequired(true).setFormat("[^\\\\/\\\\x00]+");

		type.addBooleanProperty("includeInFrontendExport", PropertyView.Public).setIndexed(true);
		type.addBooleanProperty("isExternal", PropertyView.Public).setIndexed(true);
		type.addBooleanProperty("hasParent", PropertyView.Public).setIndexed(true);
		type.addLongProperty("lastSeenMounted");

		type.addCustomProperty("path", PathProperty.class.getName(), PropertyView.Public).setIndexed(true);

		type.addPropertyGetter("hasParent", Boolean.TYPE);
		type.addPropertyGetter("parent", Folder.class);
		type.addPropertyGetter("path", String.class);

		type.addPropertySetter("hasParent", Boolean.TYPE);

		type.overrideMethod("getPositionProperty",         false, "return FolderCONTAINSAbstractFile.positionProperty;");

		type.overrideMethod("onCreation",                  true, "if (org.structr.api.config.Settings.UniquePaths.getValue()) { validateAndRenameFileOnce(arg0, arg1); }");
		type.overrideMethod("onModification",              true, "if (org.structr.api.config.Settings.UniquePaths.getValue()) { validateAndRenameFileOnce(arg0, arg1); }");
		type.overrideMethod("getSiblingLinkType",          false, "return AbstractFileCONTAINS_NEXT_SIBLINGAbstractFile.class;");
		type.overrideMethod("getChildLinkType",            false, "return FolderCONTAINSAbstractFile.class;");
		type.overrideMethod("isExternal",                  false, "return getProperty(isExternalProperty);");
		type.overrideMethod("isBinaryDataAccessible",      false, "return !isExternal() || isMounted();").setDoExport(true);
		type.overrideMethod("isMounted",                   false, "return " + AbstractFile.class.getName() + ".isMounted(this);");
		type.overrideMethod("getFolderPath",               false, "return " + AbstractFile.class.getName() + ".getFolderPath(this);");
		type.overrideMethod("validatePath",                false, "return " + AbstractFile.class.getName() + ".validatePath(this, arg0, arg1);");
		type.overrideMethod("validateAndRenameFileOnce",   false, "return " + AbstractFile.class.getName() + ".validateAndRenameFileOnce(this, arg0, arg1);");
		type.overrideMethod("includeInFrontendExport",     false, "return " + AbstractFile.class.getName() + ".includeInFrontendExport(this);");

		type.addMethod("setParent")
			.setSource("setProperty(parentProperty, (Folder)parent);")
			.addException(FrameworkException.class.getName())
			.addParameter("parent", "org.structr.web.entity.Folder");

		final JsonReferenceType parentRel  = folder.relate(type, "CONTAINS", Relation.Cardinality.OneToMany, "parent", "children");
		final JsonReferenceType siblingRel = type.relate(type, "CONTAINS_NEXT_SIBLING", Cardinality.OneToOne,  "previousSibling", "nextSibling");

		type.addIdReferenceProperty("parentId",      parentRel.getSourceProperty());
		type.addIdReferenceProperty("nextSiblingId", siblingRel.getTargetProperty());

		// sort position of children in page
		parentRel.addIntegerProperty("position");
	}}

	void setParent(final Folder parent) throws FrameworkException;
	void setHasParent(final boolean hasParent) throws FrameworkException;
	Folder getParent();

	String getPath();
	String getFolderPath();

	boolean isMounted();
	boolean isExternal();
	boolean getHasParent();
	boolean isBinaryDataAccessible();
	boolean includeInFrontendExport();

	boolean validatePath(final SecurityContext securityContext, final ErrorBuffer errorBuffer) throws FrameworkException;
	boolean validateAndRenameFileOnce(final SecurityContext securityContext, final ErrorBuffer errorBuffer) throws FrameworkException;

	/*
	private static final Logger logger = LoggerFactory.getLogger(AbstractFile.class.getName());

	public static final Property<Folder> parent                    = new StartNode<>("parent", FolderChildren.class);
	public static final Property<List<AbstractFile>> children      = new EndNodes<>("children", FileChildren.class);
	public static final Property<AbstractFile> previousSibling     = new StartNode<>("previousSibling", FileSiblings.class);
	public static final Property<AbstractFile> nextSibling         = new EndNode<>("nextSibling", FileSiblings.class);
	public static final Property<List<String>> childrenIds         = new CollectionIdProperty("childrenIds", children);
	public static final Property<String> nextSiblingId             = new EntityIdProperty("nextSiblingId", nextSibling);
	public static final Property<String> path                      = new PathProperty("path").indexed().readOnly();
	public static final Property<String> parentId                  = new EntityIdProperty("parentId", parent);
	public static final Property<Boolean> hasParent                = new BooleanProperty("hasParent").indexed();

	public static final Property<Long> lastSeenMounted             = new LongProperty("lastSeenMounted");
	public static final Property<Boolean> isExternal               = new BooleanProperty("isExternal").writeOnce();
	public static final Property<Boolean> isMounted                = new MethodCallProperty<>("isMounted", AbstractFile.class, "isMounted");

	public static final Property<Boolean>  includeInFrontendExport = new BooleanProperty("includeInFrontendExport").cmis().indexed();

	public static final View defaultView = new View(AbstractFile.class, PropertyView.Public,
		path, isExternal, isMounted, lastSeenMounted
	);

	public static final View uiView = new View(AbstractFile.class, PropertyView.Ui,
		path, isExternal, isMounted, lastSeenMounted
	);

	@Override
	public boolean onCreation(final SecurityContext securityContext, final ErrorBuffer errorBuffer) throws FrameworkException {

		boolean valid = true;

		if (Settings.UniquePaths.getValue()) {
			valid = validateAndRenameFileOnce(securityContext, errorBuffer);
		}

		return valid && super.onCreation(securityContext, errorBuffer);
	}

	@Override
	public boolean onModification(final SecurityContext securityContext, final ErrorBuffer errorBuffer, final ModificationQueue modificationQueue) throws FrameworkException {

		boolean valid = true;

		if (Settings.UniquePaths.getValue()) {
			valid = validateAndRenameFileOnce(securityContext, errorBuffer);
		}

		return valid && super.onModification(securityContext, errorBuffer, modificationQueue);
	}
	*/

	static boolean validatePath(final AbstractFile thisFile, final SecurityContext securityContext, final ErrorBuffer errorBuffer) throws FrameworkException {

		final PropertyKey<String> pathKey = StructrApp.key(AbstractFile.class, "path");
		final String filePath             = thisFile.getProperty(pathKey);

		if (filePath != null) {

			final List<AbstractFile> files = StructrApp.getInstance().nodeQuery(AbstractFile.class).and(pathKey, filePath).getAsList();
			for (final AbstractFile file : files) {

				if (!file.getUuid().equals(thisFile.getUuid())) {

					if (errorBuffer != null) {

						final UniqueToken token = new UniqueToken(AbstractFile.class.getSimpleName(), pathKey, file.getUuid());
						token.setValue(filePath);

						errorBuffer.add(token);
					}

					return false;
				}
			}
		}

		return true;
	}

	static boolean validateAndRenameFileOnce(final AbstractFile thisFile, final SecurityContext securityContext, final ErrorBuffer errorBuffer) throws FrameworkException {

		final PropertyKey<String> pathKey = StructrApp.key(AbstractFile.class, "path");
		boolean valid                     = thisFile.validatePath(securityContext, null);

		if (!valid) {

			final String originalPath = thisFile.getProperty(pathKey);
			final String newName      = thisFile.getProperty(AbstractFile.name).concat("_").concat(FileHelper.getDateString());

			thisFile.setProperty(AbstractNode.name, newName);

			valid = thisFile.validatePath(securityContext, errorBuffer);

			if (valid) {
				logger.warn("File {} already exists, renaming to {}", new Object[] { originalPath, newName });
			} else {
				logger.warn("File {} already existed. Tried renaming to {} and failed. Aborting.", new Object[] { originalPath, newName });
			}

		}

		return valid;

	}

	static String getFolderPath(final AbstractFile thisFile) {

		Folder parentFolder = thisFile.getParent();
		String folderPath   = thisFile.getProperty(AbstractFile.name);

		if (folderPath == null) {
			folderPath = thisFile.getUuid();
		}

		while (parentFolder != null) {

			folderPath   = parentFolder.getName().concat("/").concat(folderPath);
			parentFolder = parentFolder.getParent();
		}

		return "/".concat(folderPath);
	}

	static boolean includeInFrontendExport(final AbstractFile thisFile) {

		if (thisFile.getProperty(StructrApp.key(File.class, "includeInFrontendExport"))) {

			return true;
		}

		final Folder _parent = thisFile.getParent();
		if (_parent != null) {

			// recurse
			return _parent.includeInFrontendExport();
		}

		return false;
	}

	static boolean isMounted(final AbstractFile thisFile) {

		if (thisFile.getProperty(StructrApp.key(Folder.class, "mountTarget")) != null) {
			return true;
		}

		final Folder parent = thisFile.getParent();
		if (parent != null) {

			return parent.isMounted();
		}

		return false;
	}

	// ----- protected methods -----
	static java.io.File defaultGetFileOnDisk(final File fileBase, final boolean create) {

		final String uuid       = fileBase.getUuid();
		final String filePath   = Settings.FilesPath.getValue();
		final String uuidPath   = AbstractFile.getDirectoryPath(uuid);
		final java.io.File file = new java.io.File(filePath + "/" + uuidPath + "/" + uuid);

		// create parent directory tree
		file.getParentFile().mkdirs();

		// create file only if requested
		if (!file.exists() && create && !fileBase.isExternal()) {

			try {

				file.createNewFile();

			} catch (IOException ioex) {

				logger.error("Unable to create file {}: {}", file, ioex.getMessage());
			}
		}

		return file;
	}

	static String getDirectoryPath(final String uuid) {

		return (uuid != null)
			? uuid.substring(0, 1) + "/" + uuid.substring(1, 2) + "/" + uuid.substring(2, 3) + "/" + uuid.substring(3, 4)
			: null;

	}

	/*
	// ----- nested classes -----
	private static class MethodCallProperty<T> extends AbstractReadOnlyProperty<T> {

		private Method method = null;

		public MethodCallProperty(final String name, final Class type, final String methodName) {

			super(name);

			try {

				this.method = type.getDeclaredMethod(methodName);

			} catch (Throwable t) {
				t.printStackTrace();
			}
		}

		@Override
		public Class valueType() {
			return Boolean.class;
		}

		@Override
		public Class relatedType() {
			return null;
		}

		@Override
		public T getProperty(SecurityContext securityContext, GraphObject obj, boolean applyConverter) {
			return getProperty(securityContext, obj, applyConverter, null);
		}

		@Override
		public T getProperty(SecurityContext securityContext, GraphObject obj, boolean applyConverter, Predicate<GraphObject> predicate) {

			try {

				return (T)method.invoke(obj);

			} catch (Throwable t) {
				logger.warn("Unable to call method {}: {}", method.getName(), t.getMessage());
			}

			return null;
		}

		@Override
		public boolean isCollection() {
			return false;
		}

		@Override
		public SortType getSortType() {
			return SortType.Default;
		}
	}
	*/
}
