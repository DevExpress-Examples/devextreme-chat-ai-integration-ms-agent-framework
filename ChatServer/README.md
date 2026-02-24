# ChatServer

A .NET 10 Web API project that provides chat endpoints powered by Microsoft Agent Framework.

## Overview

This is an API-only server that handles chat functionality using Azure OpenAI, AI agents, and a workflow that combines vision analysis, DevExpress documentation lookup (via MCP tools), and response editing. While Azure OpenAI is used here, any compatible chat client can be plugged in through the Microsoft Agent Framework. It provides REST endpoints for sending messages and retrieving chat history.

## Features

- **API-only architecture** - No Views or static files
- **Microsoft Agent Framework** - Multi-agent workflow (Vision, Support, Editor)
- **MCP tools** - DevExpress documentation tools from `https://api.devexpress.com/mcp/docs`
- **Session-based chat history** - Maintains conversation context per session
- **CORS enabled** - Allows cross-origin requests from client applications
- **Port 5005/5006** - Runs on HTTP 5005 and HTTPS 5006

## Project Structure

```
ChatServer/
├── Configuration/
│   └── AzureOpenAIOptions.cs    # Azure OpenAI configuration options
├── Controllers/
│   └── ChatController.cs        # API endpoints for chat operations
├── Models/
│   └── ClientChatMessage.cs     # Chat message DTOs
├── Services/
│   └── DataService.cs           # Session-based message storage
├── Program.cs                   # App startup, chat client setup, and agents/workflow configuration
├── appsettings.json             # Application settings
└── ChatServer.csproj            # Project file
```

## API Endpoints

### POST /api/Chat/GetAIResponse
Sends a message to the AI workflow and returns the assistant response.

**Request Body (multipart/form-data):**

- `text` (string) - Message text
- `id` (string) - Client message id
- `timestamp` (string, ISO 8601) - Message timestamp
- `attachments` (json) - Optional attachments metadata
- `files` (file[]) - Optional files for vision analysis

**Query Parameters:**

- `regenerate` (bool, optional): If true, removes the last message and regenerates response

**Response:**

```json
{
  "id": "response-id",
  "text": "AI response text",
  "timestamp": "2025-10-08T12:00:01Z",
  "author": {
    "id": "assistant",
    "name": "Virtual Assistant"
  }
}
```

### GET /api/Chat/GetUserMessages
Retrieves all messages from the current session.

**Response:**

```json
[
  {
    "id": "message-id",
    "text": "Message text",
    "timestamp": "2025-10-08T12:00:00Z",
    "author": {
      "id": "user",
      "name": "User"
    }
  }
]
```

## Configuration

Update `appsettings.json` with your Azure OpenAI credentials:

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://your-resource.openai.azure.com/",
    "ApiKey": "your-api-key",
    "ModelName": "your-deployment-name"
  }
}
```

## Running the Server

```bash
dotnet run
```

The server will start on:
- HTTP: http://localhost:5005
- HTTPS: https://localhost:5006

## CORS Policy

The server allows all requests from `http://localhost:5050` (all methods and headers). Use this configuration for development purposes only. In production, update the CORS policy in `Program.cs` to restrict allowed origins as needed.

## Session Management

Chat history is stored in session storage with a 15-minute idle timeout. Sessions are stored in memory and automatically cleaned up after timeout.
