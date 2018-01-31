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
package org.structr.web.basic;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URISyntaxException;
import org.apache.tika.io.IOUtils;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;
import org.junit.Test;
import org.structr.common.error.FrameworkException;
import org.structr.core.entity.Relation;
import org.structr.rest.maintenance.SnapshotCommand;
import org.structr.schema.export.StructrSchema;
import org.structr.schema.json.InvalidSchemaException;
import org.structr.schema.json.JsonObjectType;
import org.structr.schema.json.JsonReferenceType;
import org.structr.schema.json.JsonSchema;
import org.structr.web.StructrUiTest;

public class SchemaSnapshotTest extends StructrUiTest {

	@Test
	public void testSnapshotRoundtripWithPrimitives() {

		File file     = null;
		String source = null;
		String export = null;
		String imp    = null;

		// 1. step: create schema with all possible (primitive) property types
		try {

			// create new instance id
			app.getInstanceId();

			final JsonSchema sourceSchema = StructrSchema.createFromDatabase(app);


			// a customer
			final JsonObjectType customer = sourceSchema.addType("Customer");
			customer.addStringProperty("name", "public", "ui").setRequired(true).setUnique(true);
			customer.addStringProperty("street", "public", "ui");
			customer.addStringProperty("city", "public", "ui");
			customer.addDateProperty("birthday", "public", "ui");
			customer.addEnumProperty("status", "public", "ui").setEnums("active", "retired", "none").setDefaultValue("active");
			customer.addIntegerProperty("count", "public", "ui").setMinimum(1).setMaximum(10, true).setDefaultValue("5");
			customer.addNumberProperty("number", "public", "ui").setMinimum(2.0, true).setMaximum(5.0, true).setDefaultValue("3.0");
			customer.addLongProperty("loong", "public", "ui").setMinimum(20, true).setMaximum(50);
			customer.addBooleanProperty("isCustomer", "public", "ui");
			customer.addFunctionProperty("displayName", "public", "ui").setReadFunction("concat(this.name, '.', this.id)");
			customer.addStringProperty("description", "public", "ui").setContentType("text/plain").setFormat("multi-line");
			customer.addStringArrayProperty("stringArray", "public", "ui");
			customer.addIntegerArrayProperty("intArray", "public", "ui").setMinimum(0, true).setMaximum(100, true);
			customer.addLongArrayProperty("longArray", "public", "ui").setMinimum(1, true).setMaximum(101, true);
			customer.addDoubleArrayProperty("doubleArray", "public", "ui").setMinimum(2.0, true).setMaximum(102.0, true);
			customer.addBooleanArrayProperty("booleanArray", "public", "ui");

			// a project
			final JsonObjectType project  = sourceSchema.addType("Project");
			final JsonReferenceType rel   = customer.relate(project);

			rel.setCardinality(Relation.Cardinality.OneToMany);
			rel.setCascadingDelete(JsonSchema.Cascade.sourceToTarget);
			rel.setRelationship("hasProject");
			rel.setSourcePropertyName("customer");
			rel.setTargetPropertyName("projects");

			source = sourceSchema.toString();

			try (final FileWriter writer = new FileWriter("/home/chrisi/export1.txt")) {

				writer.append(source);
				writer.flush();

			} catch (IOException ioex) {

				ioex.printStackTrace();
			}

			StructrSchema.replaceDatabaseSchema(app, sourceSchema);


		} catch (Throwable t) {
			fail("Unexpected exception");
		}

		// step 2: export schema
		try {

			app.command(SnapshotCommand.class).execute("export", "test");

		} catch (FrameworkException ex) {
			fail("Unexpected exception");
		}

		// step 3: read schema export file and compare to source
		try {

			file = new File(basePath + "/snapshots").listFiles()[0];

			export = IOUtils.toString(new FileInputStream(file)).trim();

			try (final FileWriter writer = new FileWriter("/home/chrisi/export3.txt")) {

				writer.append(export);
				writer.flush();

			} catch (IOException ioex) {

				ioex.printStackTrace();
			}

			assertEquals("Invalid schema export result, ", source, export);

		} catch (IOException t) {
			t.printStackTrace();
			fail("Unexpected exception");
		}

		// step 4: clear schema
		try {

			StructrSchema.replaceDatabaseSchema(app, StructrSchema.createEmptySchema());

		} catch (FrameworkException | InvalidSchemaException | URISyntaxException ex) {
			fail("Unexpected exception");
		}

		// step 5: import schema from export file
		try {

			app.command(SnapshotCommand.class).execute("restore", file.getName());

		} catch (FrameworkException ex) {
			fail("Unexpected exception");
		}

		// step 6: create string representation of imported schema
		try {

			final JsonSchema sourceSchema = StructrSchema.createFromDatabase(app);
			imp = sourceSchema.toString();

		} catch (Throwable t) {
			fail("Unexpected exception");
		}

		try (final FileWriter writer = new FileWriter("/home/chrisi/export2.txt")) {

			writer.append(imp);
			writer.flush();

		} catch (IOException ioex) {

			ioex.printStackTrace();
		}

		// step 7: compare import result to initial source
		assertEquals("Invalid schema export result, ", source, imp);
	}
}
