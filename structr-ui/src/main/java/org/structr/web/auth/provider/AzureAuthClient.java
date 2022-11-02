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
package org.structr.web.auth.provider;

import com.github.scribejava.apis.MicrosoftAzureActiveDirectory20Api;
import com.github.scribejava.core.builder.ServiceBuilder;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.structr.web.auth.AbstractOAuth2Client;

public class AzureAuthClient extends AbstractOAuth2Client {
    private static final Logger logger = LoggerFactory.getLogger(FacebookAuthClient.class);

    private final static String authServer = "azure";

    public AzureAuthClient(final HttpServletRequest request) {

        super(request, authServer);

        service = new ServiceBuilder(clientId)
                .apiSecret(clientSecret)
                .callback(redirectUri)
                .defaultScope(scope)
                .build(MicrosoftAzureActiveDirectory20Api.instance());
    }
}
