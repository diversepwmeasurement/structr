/*
 * Copyright (C) 2010-2021 Structr GmbH
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
package org.structr.web.function;

import org.structr.api.config.Settings;
import org.structr.common.error.ArgumentCountException;
import org.structr.common.error.FrameworkException;
import org.structr.rest.auth.AuthHelper;
import org.structr.rest.auth.JWTHelper;
import org.structr.schema.action.ActionContext;
import org.structr.web.entity.User;

import java.util.Calendar;
import java.util.Map;

public class CreateAccessTokenFunction extends UiAdvancedFunction {

    public static final String ERROR_MESSAGE    = "Usage: ${create_access_token(user [, accessTokenTimeout])}. Example: ${create_access_token(me [, 15])}";
    public static final String ERROR_MESSAGE_JS = "Usage: ${{Structr.create_access_token(user [, accessTokenTimeout])}}. Example: ${{Structr.create_access_token(Structr.me [, 15])}";

    @Override
    public String getName() {
        return "create_access_token";
    }

    @Override
    public String getSignature() {
        return "user, accessTokenTimeout";
    }

    @Override
    public Object apply(ActionContext ctx, Object caller, Object[] sources) throws FrameworkException {

        try {
            assertArrayHasMinLengthAndAllElementsNotNull(sources, 1);
            final User user = (User) sources[0];
            int accessTokenTimeout = Settings.JWTExpirationTimeout.getValue();
            int refreshTokenTimeout = Settings.JWTRefreshTokenExpirationTimeout.getValue();

            if (sources.length > 1) {
                accessTokenTimeout = (int) sources[1];
            }

            Calendar accessTokenExpirationDate = Calendar.getInstance();
            accessTokenExpirationDate.add(Calendar.MINUTE, accessTokenTimeout);

            Calendar refreshTokenExpirationDate = Calendar.getInstance();
            refreshTokenExpirationDate.add(Calendar.MINUTE, refreshTokenTimeout);

            Map<String, String> tokens = JWTHelper.createTokensForUser(user, accessTokenExpirationDate.getTime(), refreshTokenExpirationDate.getTime());

            return tokens.get("access_token");

        } catch (ArgumentCountException pe) {

            logParameterError(caller, sources, pe.getMessage(), ctx.isJavaScriptContext());
            return usage(ctx.isJavaScriptContext());

        }
    }

    @Override
    public String usage(boolean inJavaScriptContext) {
        return (inJavaScriptContext ? ERROR_MESSAGE_JS : ERROR_MESSAGE);
    }

    @Override
    public String shortDescription() {
        return "Creates an access token for the given user";
    }
}
