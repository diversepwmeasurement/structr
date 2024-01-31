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
package org.structr.core.script;

import org.apache.commons.lang3.StringUtils;
import org.graalvm.polyglot.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.structr.api.Predicate;
import org.structr.api.util.FixedSizeCache;
import org.structr.api.util.Iterables;
import org.structr.common.SecurityContext;
import org.structr.common.error.AssertException;
import org.structr.common.error.FrameworkException;
import org.structr.common.error.UnlicensedScriptException;
import org.structr.common.event.RuntimeEventLog;
import org.structr.core.GraphObject;
import org.structr.core.GraphObjectMap;
import org.structr.core.app.StructrApp;
import org.structr.core.entity.AbstractNode;
import org.structr.core.entity.AbstractSchemaNode;
import org.structr.core.entity.SchemaMethod;
import org.structr.core.function.Functions;
import org.structr.core.graph.TransactionCommand;
import org.structr.core.property.DateProperty;
import org.structr.core.script.polyglot.PolyglotWrapper;
import org.structr.core.script.polyglot.context.ContextFactory;
import org.structr.schema.action.ActionContext;
import org.structr.schema.action.EvaluationHints;
import org.structr.schema.parser.DatePropertyParser;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class Scripting {

	private static final Pattern importPattern                      = Pattern.compile("import([ \\n\\t]*(?:[^ \\n\\t\\{\\}]+[ \\n\\t]*,?)?(?:[ \\n\\t]*\\{(?:[ \\n\\t]*[^ \\n\\t\"'\\{\\}]+[ \\n\\t]*,?)+\\})?[ \\n\\t]*)from[ \\n\\t]*(['\"])([^'\"\\n]+)(?:['\"])");
	private static final FixedSizeCache<String, Source> sourceCache = new FixedSizeCache<>("Source Cache", 10000);
	private static final Pattern ScriptEngineExpression             = Pattern.compile("^\\$\\{(\\w+)\\{(.*)\\}\\}$", Pattern.DOTALL);
	private static final Logger logger                              = LoggerFactory.getLogger(Scripting.class.getName());

	public static String replaceVariables(final ActionContext actionContext, final GraphObject entity, final Object rawValue) throws FrameworkException {
		return replaceVariables(actionContext, entity, rawValue, false, "script source");
	}

	public static String replaceVariables(final ActionContext actionContext, final GraphObject entity, final Object rawValue, final String methodName) throws FrameworkException {
		return replaceVariables(actionContext, entity, rawValue, false, methodName);
	}

	public static String replaceVariables(final ActionContext actionContext, final GraphObject entity, final Object rawValue, final boolean returnNullValueForEmptyResult, final String methodName) throws FrameworkException {

		if (rawValue == null) {

			return null;
		}

		// don't parse empty values
		if (StringUtils.isEmpty(rawValue.toString())) {

			return "";
		}

		boolean valueWasNull = true;
		String value;

		if (rawValue instanceof String) {

			value = (String) rawValue;

			// this is a very important check here, the ActionContext can be set to "raw" mode
			if (!actionContext.returnRawValue()) {

				final List<Tuple> replacements = new LinkedList<>();

				for (final String expression : extractScripts(value)) {

					try {

						final Object extractedValue = evaluate(actionContext, entity, expression, methodName, 0, entity != null ? entity.getUuid() : null);
						String partValue            = extractedValue != null ? formatToDefaultDateOrString(extractedValue) : "";

						// non-null value?
						valueWasNull &= extractedValue == null;

						if (partValue != null) {

							replacements.add(new Tuple(expression, partValue));

						} else {

							if (!value.equals(expression)) {
								replacements.add(new Tuple(expression, ""));
							}
						}

					} catch (UnlicensedScriptException ex) {
						ex.log(logger);
					}
				}

				// apply replacements
				for (final Tuple tuple : replacements) {

					// only replace a single occurrence at a time!
					value = StringUtils.replaceOnce(value, tuple.key, tuple.value);
				}
			}

		} else if (rawValue instanceof Boolean) {

			value = Boolean.toString((Boolean) rawValue);

		} else {

			value = rawValue.toString();
		}

		if (returnNullValueForEmptyResult && valueWasNull && StringUtils.isBlank(value)) {
			return null;
		}

		return value;
	}

	public static Object evaluate(final ActionContext actionContext, final GraphObject entity, final String input, final String methodName) throws FrameworkException, UnlicensedScriptException {
		return evaluate(actionContext, entity, input, methodName, null);
	}

	public static Object evaluate(final ActionContext actionContext, final GraphObject entity, final String input, final String methodName, final String codeSource) throws FrameworkException, UnlicensedScriptException {
		return evaluate(actionContext, entity, input, methodName, 0, codeSource);
	}

	public static Object evaluate(final ActionContext actionContext, final GraphObject entity, final String input, final String methodName, final int startRow, final String codeSource) throws FrameworkException, UnlicensedScriptException {

		final String expression = StringUtils.strip(input);
		boolean isJavascript    = expression.startsWith("${{") && expression.endsWith("}}");
		final int prefixOffset  = isJavascript ? 1 : 0;
		String source           = expression.substring(2 + prefixOffset, expression.length() - (1 + prefixOffset));

		if (source.length() <= 0) {
			return null;
		}

		boolean isScriptEngine = false;
		String engine = "";

		if (!isJavascript) {

			final Matcher matcher = ScriptEngineExpression.matcher(expression);
			if (matcher.matches()) {

				engine = matcher.group(1);
				source = matcher.group(2);

				logger.debug("Scripting engine {} requested.", engine);

				isJavascript = StringUtils.isBlank(engine) || "JavaScript".equals(engine);
				isScriptEngine = !isJavascript && StringUtils.isNotBlank(engine);
			}
		}

		actionContext.setJavaScriptContext(isJavascript);

		// temporarily disable notifications for scripted actions

		boolean enableTransactionNotifications = false;

		final SecurityContext securityContext = actionContext.getSecurityContext();
		if (securityContext != null) {

			enableTransactionNotifications = securityContext.doTransactionNotifications();

			securityContext.setDoTransactionNotifications(false);
		}

		final Snippet snippet = new Snippet(methodName, source);
		snippet.setCodeSource(codeSource);
		snippet.setStartRow(startRow);

		if (isScriptEngine) {

			return evaluateScript(actionContext, entity, engine, snippet);

		} else if (isJavascript) {

			final Object result = evaluateJavascript(actionContext, entity, snippet);

			if (enableTransactionNotifications && securityContext != null) {
				securityContext.setDoTransactionNotifications(true);
			}

			return result;

		} else {

			try {

				final EvaluationHints hints = new EvaluationHints();
				Object extractedValue       = Functions.evaluate(actionContext, entity, snippet, hints);
				final String value          = extractedValue != null ? extractedValue.toString() : "";
				final String output         = actionContext.getOutput();

				if (StringUtils.isEmpty(value) && output != null && !output.isEmpty()) {
					extractedValue = output;
				}

				if (enableTransactionNotifications && securityContext != null) {
					securityContext.setDoTransactionNotifications(true);
				}

				/* disabled
				hints.checkForErrorsAndThrowException((message, row, column) -> {
					// report usage errors (missing keys etc.)
					reportError(actionContext.getSecurityContext(), entity, message, row, column, snippet);
				});
				*/

				return extractedValue;

			} catch (StructrScriptException t) {

				// This block reports syntax errors in StructrScript expressions
				// StructrScript evaluation should not throw exceptions

				reportError(actionContext.getSecurityContext(), entity, t.getMessage(), t.getRow(), t.getColumn(), snippet);
			}

			return null;
		}
	}

	public static Object evaluateJavascript(final ActionContext actionContext, final GraphObject entity, final Snippet snippet) throws FrameworkException {

		// Clear output buffer
		actionContext.clear();

		if (actionContext.hasError()) {
			// Reset error buffer
			actionContext.getErrorBuffer().getErrorTokens().clear();
			actionContext.getErrorBuffer().setStatus(0);
		}

		try {
			final Context context = ContextFactory.getContext("js", actionContext, entity);

			context.enter();

			try {

				Object result = null;

				try {

					Source source = sourceCache.get(snippet.getSource());
					if (source == null) {

						final String code = embedInFunction(snippet);

						source = Source.newBuilder("js", code, snippet.getName()).mimeType(snippet.getMimeType()).build();

						// store in cache
						sourceCache.put(snippet.getSource(), source);
					}

					final Value value = context.eval(source);

					result = PolyglotWrapper.unwrap(actionContext, value);

				} catch (PolyglotException ex) {

					if (ex.isHostException() && ex.asHostException() instanceof RuntimeException) {

						reportError(actionContext.getSecurityContext(), entity, ex, snippet);
						// Unwrap FrameworkExceptions wrapped in RuntimeExceptions, if neccesary
						if (ex.asHostException().getCause() instanceof FrameworkException) {
							throw ex.asHostException().getCause();
						} else {
							throw ex.asHostException();
						}
					}

					reportError(actionContext.getSecurityContext(), entity, ex, snippet);
					throw new FrameworkException(422, "Server-side scripting error", ex);
				}

				// Prefer explicitly printed output over actual result
				final String outputBuffer = actionContext.getOutput();
				if (outputBuffer != null && !outputBuffer.isEmpty()) {

					return outputBuffer;
				}

				return result != null ? result : "";

			} catch (RuntimeException ex) {

				if (ex.getCause() instanceof FrameworkException) {

					throw (FrameworkException) ex.getCause();

				} else if (ex instanceof AssertException) {

					throw ex;
				} else {

					throw ex;
				}

			} catch (FrameworkException ex) {

				throw ex;

			} catch (Throwable ex) {

				throw new FrameworkException(422, "Server-side scripting error", ex);

			} finally {

				context.leave();
			}

		} finally {

			//actionContext.putScriptingContext("js", null);
		}
	}

	// ----- private methods -----
	private static Object evaluateScript(final ActionContext actionContext, final GraphObject entity, final String engineName, final Snippet snippet) throws FrameworkException {

		try {

			final Context context = ContextFactory.getContext(engineName, actionContext, entity);

			context.enter();

			// Clear output buffer
			actionContext.clear();

			if (actionContext.hasError()) {
				// Reset error buffer
				actionContext.getErrorBuffer().getErrorTokens().clear();
				actionContext.getErrorBuffer().setStatus(0);
			}

			Object result = null;

			try {

				Source source = sourceCache.get(snippet.getSource());

				if (source == null) {

					source = Source.newBuilder(engineName, snippet.getSource(), snippet.getName()).build();

					// store in cache
					sourceCache.put(snippet.getSource(), source);
				}

				final Value value = context.eval(source);

				result = PolyglotWrapper.unwrap(actionContext, value);

			} catch (PolyglotException ex) {

				if (ex.isHostException() && ex.asHostException() instanceof RuntimeException) {

					reportError(actionContext.getSecurityContext(), entity, ex, snippet);
					// Unwrap FrameworkExceptions wrapped in RuntimeExceptions, if neccesary
					if (ex.asHostException().getCause() instanceof FrameworkException) {
						throw ex.asHostException().getCause();
					} else {
						throw ex.asHostException();
					}
				}

				reportError(actionContext.getSecurityContext(), entity, ex, snippet);
				throw new FrameworkException(422, "Server-side scripting error", ex);
			}

			context.leave();

			// Prefer explicitly printed output over actual result
			final String outputBuffer = actionContext.getOutput();
			if (outputBuffer != null && !outputBuffer.isEmpty()) {

				return outputBuffer;
			}

			return result != null ? result : "";

		} catch (RuntimeException ex) {

			if (ex.getCause() instanceof FrameworkException) {

				throw (FrameworkException) ex.getCause();
			} else if (ex instanceof AssertException) {

				throw ex;
			} else {

				throw ex;
			}

		} catch (FrameworkException ex) {

			throw ex;

		} catch (Throwable ex) {

			throw new FrameworkException(422, "Server-side scripting error", ex);

		} finally {

			//actionContext.putScriptingContext(engineName, null);
		}
	}

	private static String embedInFunction(final Snippet snippet) {

		if (snippet.embed()) {

			final String transpiledSource;
			// Regex that matches import statements

			if (importPattern.matcher(snippet.getSource()).find()) {

				final Map<Boolean, List<String>> partitionedScript = snippet.getSource().lines().collect(Collectors.partitioningBy(x -> importPattern.matcher(x).find()));
				final String importStatements = String.join("\n", partitionedScript.get(true));
				final String code = String.join("\n", partitionedScript.get(false));

				StringBuilder reassembledScript = new StringBuilder();
				reassembledScript
						.append(importStatements).append("\n")
						.append("function main() {\n")
						.append(code)
						.append("\n}\n\nmain();");
				transpiledSource = reassembledScript.toString();
				// Change mimetype to module since import statements have been found.
				snippet.setMimeType("application/javascript+module");
			} else {

				transpiledSource = "function main() {" + snippet.getSource() + "\n}\n\nmain();";
			}

			snippet.setTranscribedSource(transpiledSource);
		}

		if (snippet.getTranscribedSource() == null) {

			return snippet.getSource();
		}

		return snippet.getTranscribedSource();
	}

	// this is only public to be testable :(
	public static List<String> extractScripts(final String source) {

		final List<String> expressions = new LinkedList<>();
		final StringBuilder buffer     = new StringBuilder();
		final int length               = source.length();
		boolean inComment              = false;
		boolean inSingleQuotes         = false;
		boolean inDoubleQuotes         = false;
		boolean inTemplate             = false;
		boolean hasSlash               = false;
		boolean hasBackslash           = false;
		boolean hasDollar              = false;
		int level                      = 0;
		int start                      = 0;
		int end                        = 0;

		for (int i=0; i<length; i++) {

			final char c = source.charAt(i);

			buffer.append(c);

			switch (c) {

				case '\\':
					hasBackslash = true;
					break;

				case '\'':
					if (inTemplate && !inDoubleQuotes && !hasBackslash && !inComment) {
						inSingleQuotes = !inSingleQuotes;
					}
					hasDollar = false;
					hasBackslash = false;
					break;

				case '\"':
					if (inTemplate && !inSingleQuotes && !hasBackslash && !inComment) {
						inDoubleQuotes = !inDoubleQuotes;
					}
					hasDollar = false;
					hasBackslash = false;
					break;

				case '$':
					if (!inComment) {
						hasDollar = true;
						hasBackslash = false;
					}
					break;

				case '{':
					if (!inTemplate && hasDollar && !inComment) {

						inTemplate = true;
						start = i-1;

					} else if (inTemplate && !inSingleQuotes && !inDoubleQuotes && !inComment) {
						level++;
					}

					hasDollar = false;
					hasBackslash = false;
					break;

				case '}':

					if (!inSingleQuotes && !inDoubleQuotes && inTemplate && !inComment && level-- == 0) {

						inTemplate = false;
						end = i+1;

						expressions.add(source.substring(start, end));

						level = 0;

					} else {

						//otherParts.add(buffer.toString());
						buffer.setLength(0);
					}
					hasDollar = false;
					hasBackslash = false;
					break;

				case '/':

					if (inTemplate && !inComment && !inSingleQuotes && !inDoubleQuotes) {

						if (hasSlash) {

							inComment = true;
							hasSlash  = false;

						} else {

							hasSlash = true;
						}
					}
					break;

				case '\r':
				case '\n':
					inComment = false;
					break;

				default:
					hasDollar = false;
					hasBackslash = false;
					break;
			}
		}

		return expressions;
	}

	public static String formatToDefaultDateOrString(final Object value) {

		if (value == null) {

			return "null";

		} else if (value instanceof Date) {

			return DatePropertyParser.format((Date) value, DateProperty.getDefaultFormat());

		} else if (value instanceof Iterable) {

			return Iterables.toList((Iterable)value).toString();

		} else {

			return value.toString();

		}
	}

	public static String formatForLogging(final Object value) {

		if (value == null) {

			return "null";

		} else if (value instanceof Date) {

			return DatePropertyParser.format((Date) value, DateProperty.getDefaultFormat());

		} else if (value instanceof Iterable) {

			final StringBuilder buf = new StringBuilder();
			final Iterable iterable = (Iterable)value;

			buf.append("[");

			for (final Iterator it = iterable.iterator(); it.hasNext();) {

				buf.append(Scripting.formatToDefaultDateOrString(it.next()));

				if (it.hasNext()) {
					buf.append(", ");
				}
			}

			buf.append("]");

			return buf.toString();

		} else if (value instanceof GraphObject && !(value instanceof GraphObjectMap)) {

			final StringBuilder buf = new StringBuilder();
			final GraphObject obj   = (GraphObject)value;
			final String name       = obj.getProperty(AbstractNode.name);

			buf.append(obj.getType());
			buf.append("(");

			if (StringUtils.isNotBlank(name)) {

				buf.append(name);
				buf.append(", ");
			}

			buf.append(obj.getUuid());
			buf.append(")");

			return buf.toString();

		} else {

			return value.toString();

		}
	}

	private static void reportError(final SecurityContext securityContext, final GraphObject entity, final PolyglotException ex, final Snippet snippet) throws FrameworkException {

		final String message = ex.getMessage();
		int lineNumber       = 1;
		int columnNumber     = 1;
		int endLineNumber    = 1;
		int endColumnNumber  = 1;

		final SourceSection location = ex.getSourceLocation();
		if (location != null) {

			lineNumber      = location.getStartLine();
			columnNumber    = location.getStartColumn();
			endLineNumber   = location.getEndLine();
			endColumnNumber = location.getEndColumn();
		}

		reportError(securityContext, entity, message, lineNumber, columnNumber, endLineNumber, endColumnNumber, snippet);
	}

	private static void reportError(final SecurityContext securityContext, final GraphObject entity, final String message, final int lineNumber, final int columnNumber, final Snippet snippet) throws FrameworkException {

		reportError(securityContext, entity, message, lineNumber, columnNumber, lineNumber, columnNumber, snippet);

	}

	private static void reportError(final SecurityContext securityContext, final GraphObject entity, final String message, final int lineNumber, final int columnNumber, final int endLineNumber, final int endColumnNumber, final Snippet snippet) throws FrameworkException {

		final String entityName               = snippet.getName();
		final String entityDescription        = (StringUtils.isNotBlank(entityName) ? "\"" + entityName + "\":" : "" ) + snippet.getCodeSource();
		final Map<String, Object> messageData = new LinkedHashMap<>();
		final Map<String, Object> eventData   = new LinkedHashMap<>();
		final StringBuilder exceptionPrefix   = new StringBuilder();
		final String errorName                = "Scripting Error";

		eventData.putAll(
			Map.of(
				"errorName", errorName,
				"row", lineNumber + snippet.getStartRow(),
				"column", columnNumber,
				"endRow", endLineNumber + snippet.getStartRow(),
				"endColumn", endColumnNumber,
				"entity", entityDescription
			)
		);
		messageData.putAll(
			Map.of(
				"type", "SCRIPTING_ERROR",
				"row", lineNumber + snippet.getStartRow(),
				"column", columnNumber,
				"endRow", endLineNumber + snippet.getStartRow(),
				"endColumn", endColumnNumber
			)
		);

		putIfNotNull(eventData,   "message", message);
		putIfNotNull(messageData, "message", message);

		final String codeSourceId = snippet.getCodeSource();
		if (codeSourceId != null) {

			String nodeType = null;
			String nodeId = null;

			if (entity != null) {

				final String entityType = entity.getClass().getSimpleName();
				final String entityId = entity.getUuid();

				messageData.put("entityType", entityType);
				messageData.put("entityId", entityId);
				eventData.put("entityType", entityType);
				eventData.put("entityId", entityId);

				exceptionPrefix.append(entityType).append("[").append(entityId).append("]:");

			}

			final GraphObject codeSource = StructrApp.getInstance().getNodeById(codeSourceId);
			if (codeSource != null) {

				nodeType = codeSource.getClass().getSimpleName();
				nodeId = codeSource.getUuid();

				if (codeSource instanceof SchemaMethod && ((SchemaMethod)codeSource).isStaticMethod()) {

					final AbstractSchemaNode node = codeSource.getProperty(SchemaMethod.schemaNode);
					final String staticTypeName = node.getName();
					messageData.put("staticType", staticTypeName);
					messageData.put("isStaticMethod", true);
					eventData.put("staticType", staticTypeName);
					eventData.put("isStaticMethod", true);

					exceptionPrefix.append(staticTypeName).append("[static]:");
				} else {

					if (entity == null) {
						// Only generate generic exception prefix, if none has been written for entity
						exceptionPrefix.append(nodeType).append("[").append(nodeId).append("]:");
					}
				}

			}

			eventData.put("type", nodeType);
			messageData.put("nodeType", nodeType);
			eventData.put("id", nodeId);
			messageData.put("nodeId", nodeId);
		}

		if (snippet.getName() != null) {
			eventData.put("name", snippet.getName());
			messageData.put("name", snippet.getName());
		}

		RuntimeEventLog.scripting(errorName, eventData);

		TransactionCommand.simpleBroadcastGenericMessage(messageData, Predicate.only(securityContext.getSessionId()));

		exceptionPrefix.append(snippet.getName()).append(":").append(lineNumber).append(":").append(columnNumber);

		// log error but don't throw exception
		logger.warn(exceptionPrefix.toString() + ": " + message);
	}

	private static void putIfNotNull(final Map<String, Object> map, final String key, final Object value) {

		if (value != null) {

			map.put(key, value);
		}
	}

	// ----- nested classes -----
	private static class Tuple {

		public String key = null;
		public String value = null;

		public Tuple(final String key, final String value) {
			this.key = key;
			this.value = value;
		}
	}
}
