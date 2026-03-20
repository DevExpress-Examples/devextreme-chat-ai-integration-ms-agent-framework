# ChatServer

ChatServer is an API-only Web API that exposes REST endpoints for sending messages and retrieving chat history. It is powered by the [Microsoft Agent Framework](https://github.com/microsoft/agent-framework) and uses [Azure OpenAI](https://azure.microsoft.com/en-us/pricing/details/azure-openai/) for chat completions.

## Features

- **API-only architecture** - No Views or static files
- **Microsoft Agent Framework** - Multi-agent workflow (VisionAgent, SupportAgent, Editor)
- **Azure OpenAI integration** - Uses `Azure.AI.OpenAI` alongside with `Microsoft.Extensions.AI`
- **MCP tools** - Uses DevExpress documentation tools from `https://api.devexpress.com/mcp/docs`
- **Multipart requests** - Accepts file uploads for vision analysis
- **Session-based chat history** - Maintains conversation context per session
- **CORS enabled** - Allows cross-origin requests from client applications
- **Port 5005** - Runs on HTTP port 5005 and HTTPS port 5006

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

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)

## API Endpoints

### POST /api/Chat/GetAIResponse
Sends a message to the agent workflow and returns the assistant response.

**Request Body (multipart/form-data):**

- `text` (string) - Message text
- `id` (string) - Client message id
- `timestamp` (string, ISO 8601) - Message timestamp
- `attachments` (json) - Optional attachments metadata
- `files` (file[]) - Optional files for vision analysis

**Query Parameters:**

- `regenerate` (bool, optional): If true, removes the last message and regenerates the response

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

## Run the Server

```bash
dotnet run
```

The server will start on:
- HTTP: http://localhost:5005
- HTTPS: https://localhost:5006

## CORS Policy

The server allows all HTTP methods and headers for requests from `http://localhost:5050`, as configured in [Program.cs](Program.cs#L105) (`WithOrigins("http://localhost:5050")`). This configuration is intended for development purposes: client applications must communicate with `http://localhost:5050` or you must update the CORS policy in `Program.cs` to change the allowed origin(s). For production, restrict the allowed origins in `Program.cs` to specific domains.

## Session Management

Chat history is stored in session storage with a 15-minute idle timeout. Sessions are stored in memory and are automatically cleaned up after the idle timeout expires.
