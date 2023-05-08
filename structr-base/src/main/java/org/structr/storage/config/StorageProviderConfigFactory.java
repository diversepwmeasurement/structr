/*
 * Copyright (C) 2010-2023 Structr GmbH
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
package org.structr.storage.config;

import org.structr.storage.StorageProviderFactory;
import org.structr.storage.local.LocalFSStorageProvider;
import org.structr.storage.memory.InMemoryStorageProvider;
import org.structr.web.entity.AbstractFile;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class StorageProviderConfigFactory {

    private static final Map<String, StorageProviderConfig> providerConfigs = new ConcurrentHashMap<>();
    private static final StorageProviderConfig defaultConfig                = new StorageProviderConfig("default-local", LocalFSStorageProvider.class);

    static {
        providerConfigs.put("local", new StorageProviderConfig("local", LocalFSStorageProvider.class));
        providerConfigs.put("memory", new StorageProviderConfig("memory", InMemoryStorageProvider.class));
    }

    public static StorageProviderConfig getConfigByName(final String name) {

        return name != null && providerConfigs.containsKey(name) ? providerConfigs.get(name) : getDefaultConfig();
    }

    public static StorageProviderConfig getEffectiveConfig(final AbstractFile abstractFile) {

        return getConfigByName(StorageProviderFactory.getProviderConfigName(abstractFile));
    }

    public static StorageProviderConfig getDefaultConfig() {

        return defaultConfig;
    }

    public static void SetConfig(final String name, final StorageProviderConfig config) {

        providerConfigs.put(name, config);
    }

}
