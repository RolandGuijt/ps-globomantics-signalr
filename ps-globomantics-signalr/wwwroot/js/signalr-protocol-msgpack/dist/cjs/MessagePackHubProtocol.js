"use strict";
// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePackHubProtocol = void 0;
const msgpack_1 = require("@msgpack/msgpack");
const signalr_1 = require("@microsoft/signalr");
const BinaryMessageFormat_1 = require("./BinaryMessageFormat");
const Utils_1 = require("./Utils");
// TypeDoc's @inheritDoc and @link don't work across modules :(
// constant encoding of the ping message
// see: https://github.com/aspnet/SignalR/blob/dev/specs/HubProtocol.md#ping-message-encoding-1
// Don't use Uint8Array.from as IE does not support it
const SERIALIZED_PING_MESSAGE = new Uint8Array([0x91, signalr_1.MessageType.Ping]);
/** Implements the MessagePack Hub Protocol */
class MessagePackHubProtocol {
    /**
     *
     * @param messagePackOptions MessagePack options passed to @msgpack/msgpack
     */
    constructor(messagePackOptions) {
        /** The name of the protocol. This is used by SignalR to resolve the protocol between the client and server. */
        this.name = "messagepack";
        /** The version of the protocol. */
        this.version = 1;
        /** The TransferFormat of the protocol. */
        this.transferFormat = signalr_1.TransferFormat.Binary;
        this._errorResult = 1;
        this._voidResult = 2;
        this._nonVoidResult = 3;
        messagePackOptions = messagePackOptions || {};
        this._encoder = new msgpack_1.Encoder(messagePackOptions.extensionCodec, messagePackOptions.context, messagePackOptions.maxDepth, messagePackOptions.initialBufferSize, messagePackOptions.sortKeys, messagePackOptions.forceFloat32, messagePackOptions.ignoreUndefined, messagePackOptions.forceIntegerToFloat);
        this._decoder = new msgpack_1.Decoder(messagePackOptions.extensionCodec, messagePackOptions.context, messagePackOptions.maxStrLength, messagePackOptions.maxBinLength, messagePackOptions.maxArrayLength, messagePackOptions.maxMapLength, messagePackOptions.maxExtLength);
    }
    /** Creates an array of HubMessage objects from the specified serialized representation.
     *
     * @param {ArrayBuffer} input An ArrayBuffer containing the serialized representation.
     * @param {ILogger} logger A logger that will be used to log messages that occur during parsing.
     */
    parseMessages(input, logger) {
        // The interface does allow "string" to be passed in, but this implementation does not. So let's throw a useful error.
        if (!(Utils_1.isArrayBuffer(input))) {
            throw new Error("Invalid input for MessagePack hub protocol. Expected an ArrayBuffer.");
        }
        if (logger === null) {
            logger = signalr_1.NullLogger.instance;
        }
        const messages = BinaryMessageFormat_1.BinaryMessageFormat.parse(input);
        const hubMessages = [];
        for (const message of messages) {
            const parsedMessage = this._parseMessage(message, logger);
            // Can be null for an unknown message. Unknown message is logged in parseMessage
            if (parsedMessage) {
                hubMessages.push(parsedMessage);
            }
        }
        return hubMessages;
    }
    /** Writes the specified HubMessage to an ArrayBuffer and returns it.
     *
     * @param {HubMessage} message The message to write.
     * @returns {ArrayBuffer} An ArrayBuffer containing the serialized representation of the message.
     */
    writeMessage(message) {
        switch (message.type) {
            case signalr_1.MessageType.Invocation:
                return this._writeInvocation(message);
            case signalr_1.MessageType.StreamInvocation:
                return this._writeStreamInvocation(message);
            case signalr_1.MessageType.StreamItem:
                return this._writeStreamItem(message);
            case signalr_1.MessageType.Completion:
                return this._writeCompletion(message);
            case signalr_1.MessageType.Ping:
                return BinaryMessageFormat_1.BinaryMessageFormat.write(SERIALIZED_PING_MESSAGE);
            case signalr_1.MessageType.CancelInvocation:
                return this._writeCancelInvocation(message);
            default:
                throw new Error("Invalid message type.");
        }
    }
    _parseMessage(input, logger) {
        if (input.length === 0) {
            throw new Error("Invalid payload.");
        }
        const properties = this._decoder.decode(input);
        if (properties.length === 0 || !(properties instanceof Array)) {
            throw new Error("Invalid payload.");
        }
        const messageType = properties[0];
        switch (messageType) {
            case signalr_1.MessageType.Invocation:
                return this._createInvocationMessage(this._readHeaders(properties), properties);
            case signalr_1.MessageType.StreamItem:
                return this._createStreamItemMessage(this._readHeaders(properties), properties);
            case signalr_1.MessageType.Completion:
                return this._createCompletionMessage(this._readHeaders(properties), properties);
            case signalr_1.MessageType.Ping:
                return this._createPingMessage(properties);
            case signalr_1.MessageType.Close:
                return this._createCloseMessage(properties);
            default:
                // Future protocol changes can add message types, old clients can ignore them
                logger.log(signalr_1.LogLevel.Information, "Unknown message type '" + messageType + "' ignored.");
                return null;
        }
    }
    _createCloseMessage(properties) {
        // check minimum length to allow protocol to add items to the end of objects in future releases
        if (properties.length < 2) {
            throw new Error("Invalid payload for Close message.");
        }
        return {
            // Close messages have no headers.
            allowReconnect: properties.length >= 3 ? properties[2] : undefined,
            error: properties[1],
            type: signalr_1.MessageType.Close,
        };
    }
    _createPingMessage(properties) {
        // check minimum length to allow protocol to add items to the end of objects in future releases
        if (properties.length < 1) {
            throw new Error("Invalid payload for Ping message.");
        }
        return {
            // Ping messages have no headers.
            type: signalr_1.MessageType.Ping,
        };
    }
    _createInvocationMessage(headers, properties) {
        // check minimum length to allow protocol to add items to the end of objects in future releases
        if (properties.length < 5) {
            throw new Error("Invalid payload for Invocation message.");
        }
        const invocationId = properties[2];
        if (invocationId) {
            return {
                arguments: properties[4],
                headers,
                invocationId,
                streamIds: [],
                target: properties[3],
                type: signalr_1.MessageType.Invocation,
            };
        }
        else {
            return {
                arguments: properties[4],
                headers,
                streamIds: [],
                target: properties[3],
                type: signalr_1.MessageType.Invocation,
            };
        }
    }
    _createStreamItemMessage(headers, properties) {
        // check minimum length to allow protocol to add items to the end of objects in future releases
        if (properties.length < 4) {
            throw new Error("Invalid payload for StreamItem message.");
        }
        return {
            headers,
            invocationId: properties[2],
            item: properties[3],
            type: signalr_1.MessageType.StreamItem,
        };
    }
    _createCompletionMessage(headers, properties) {
        // check minimum length to allow protocol to add items to the end of objects in future releases
        if (properties.length < 4) {
            throw new Error("Invalid payload for Completion message.");
        }
        const resultKind = properties[3];
        if (resultKind !== this._voidResult && properties.length < 5) {
            throw new Error("Invalid payload for Completion message.");
        }
        let error;
        let result;
        switch (resultKind) {
            case this._errorResult:
                error = properties[4];
                break;
            case this._nonVoidResult:
                result = properties[4];
                break;
        }
        const completionMessage = {
            error,
            headers,
            invocationId: properties[2],
            result,
            type: signalr_1.MessageType.Completion,
        };
        return completionMessage;
    }
    _writeInvocation(invocationMessage) {
        let payload;
        if (invocationMessage.streamIds) {
            payload = this._encoder.encode([signalr_1.MessageType.Invocation, invocationMessage.headers || {}, invocationMessage.invocationId || null,
                invocationMessage.target, invocationMessage.arguments, invocationMessage.streamIds]);
        }
        else {
            payload = this._encoder.encode([signalr_1.MessageType.Invocation, invocationMessage.headers || {}, invocationMessage.invocationId || null,
                invocationMessage.target, invocationMessage.arguments]);
        }
        return BinaryMessageFormat_1.BinaryMessageFormat.write(payload.slice());
    }
    _writeStreamInvocation(streamInvocationMessage) {
        let payload;
        if (streamInvocationMessage.streamIds) {
            payload = this._encoder.encode([signalr_1.MessageType.StreamInvocation, streamInvocationMessage.headers || {}, streamInvocationMessage.invocationId,
                streamInvocationMessage.target, streamInvocationMessage.arguments, streamInvocationMessage.streamIds]);
        }
        else {
            payload = this._encoder.encode([signalr_1.MessageType.StreamInvocation, streamInvocationMessage.headers || {}, streamInvocationMessage.invocationId,
                streamInvocationMessage.target, streamInvocationMessage.arguments]);
        }
        return BinaryMessageFormat_1.BinaryMessageFormat.write(payload.slice());
    }
    _writeStreamItem(streamItemMessage) {
        const payload = this._encoder.encode([signalr_1.MessageType.StreamItem, streamItemMessage.headers || {}, streamItemMessage.invocationId,
            streamItemMessage.item]);
        return BinaryMessageFormat_1.BinaryMessageFormat.write(payload.slice());
    }
    _writeCompletion(completionMessage) {
        const resultKind = completionMessage.error ? this._errorResult : completionMessage.result ? this._nonVoidResult : this._voidResult;
        let payload;
        switch (resultKind) {
            case this._errorResult:
                payload = this._encoder.encode([signalr_1.MessageType.Completion, completionMessage.headers || {}, completionMessage.invocationId, resultKind, completionMessage.error]);
                break;
            case this._voidResult:
                payload = this._encoder.encode([signalr_1.MessageType.Completion, completionMessage.headers || {}, completionMessage.invocationId, resultKind]);
                break;
            case this._nonVoidResult:
                payload = this._encoder.encode([signalr_1.MessageType.Completion, completionMessage.headers || {}, completionMessage.invocationId, resultKind, completionMessage.result]);
                break;
        }
        return BinaryMessageFormat_1.BinaryMessageFormat.write(payload.slice());
    }
    _writeCancelInvocation(cancelInvocationMessage) {
        const payload = this._encoder.encode([signalr_1.MessageType.CancelInvocation, cancelInvocationMessage.headers || {}, cancelInvocationMessage.invocationId]);
        return BinaryMessageFormat_1.BinaryMessageFormat.write(payload.slice());
    }
    _readHeaders(properties) {
        const headers = properties[1];
        if (typeof headers !== "object") {
            throw new Error("Invalid headers.");
        }
        return headers;
    }
}
exports.MessagePackHubProtocol = MessagePackHubProtocol;
//# sourceMappingURL=MessagePackHubProtocol.js.map