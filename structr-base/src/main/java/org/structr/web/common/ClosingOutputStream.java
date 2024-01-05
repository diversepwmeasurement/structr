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
package org.structr.web.common;

import org.structr.storage.StorageProviderFactory;
import org.structr.web.entity.File;

import java.io.IOException;
import java.io.OutputStream;

/**
 */
public class ClosingOutputStream extends OutputStream {

	private final OutputStream os;
	private boolean closed = false;
	private boolean notifyIndexerAfterClosing = false;
	private File thisFile  = null;

	public ClosingOutputStream(final File thisFile, final boolean append, final boolean notifyIndexerAfterClosing) throws IOException {

		this.os = StorageProviderFactory.getStorageProvider(thisFile).getOutputStream(append);
		this.notifyIndexerAfterClosing = notifyIndexerAfterClosing;

		this.thisFile = thisFile;
	}

	@Override
	public void write(int b) throws IOException {

		os.write(b);
	}

	@Override
	public void close() throws IOException {

		if (closed) {
			return;
		}

		os.close();

		if (notifyIndexerAfterClosing) {
			thisFile.notifyUploadCompletion();
		}

		closed = true;
	}
}
