<!-- default badges list -->
![](https://img.shields.io/endpoint?url=https://codecentral.devexpress.com/api/v1/VersionRange/1140430947/25.2.2%2B)
[![](https://img.shields.io/badge/Open_in_DevExpress_Support_Center-FF7200?style=flat-square&logo=DevExpress&logoColor=white)](https://supportcenter.devexpress.com/ticket/details/T1320012)
[![](https://img.shields.io/badge/📖_How_to_use_DevExpress_Examples-e9f6fc?style=flat-square)](https://docs.devexpress.com/GeneralInformation/403183)
[![](https://img.shields.io/badge/💬_Leave_Feedback-feecdd?style=flat-square)](#does-this-example-address-your-development-requirementsobjectives)
<!-- default badges end -->
# DevExtreme Chat - AI Integration with Microsoft Agent Framework

This example demonstrates how to integrate [DevExtreme Chat](https://js.devexpress.com/Documentation/Guide/UI_Components/Chat/Overview/) with AI-powered agents built using the [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/overview/).

![Example image](images/showcase.png)

## Implementation Details

### Setup the Chat Server

This example includes a pre-configured ASP.NET Web API server (see [ChatServer](/ChatServer/)) to enable communication with AI agents built with the [Microsoft Agent Framework](https://github.com/microsoft/agent-framework). The server runs at `http://localhost:5005` and creates the following endpoints:
- `/api/Chat/GetAIResponse` (POST)
- `/api/Chat/GetUserMessages` (GET)

### Configure the Chat component

All framework projects share the same implementation:

1. Communication with the server is handled in the [onMessageEntered](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxChat/Configuration/#onMessageEntered) function. [reloadOnChange](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxChat/Configuration/#reloadOnChange) is disabled, so updates are directly [pushed to the store](https://js.devexpress.com/Documentation/Guide/Data_Binding/Data_Layer/#Data_Modification/Integration_with_Push_Services) in the function to manually update the conversation.

2. The [fileUploaderOptions](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxChat/Configuration/#fileUploaderOptions) property is used to configure the file uploading functionality:
- The [uploadFile](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxFileUploader/Configuration/#uploadFile) function is defined to enable file uploading. In this example, it is not implemented to upload files to the server. Instead, files are accessed from [onValueChanged](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxFileUploader/Configuration/#onValueChanged) and are manually cached.
- [allowedFileExtensions](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxFileUploader/Configuration/#allowedFileExtensions) specifies which file extensions are allowed.
- [dropZone](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxFileUploader/Configuration/#dropZone), [onDropZoneEnter](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxFileUploader/Configuration/#onDropZoneEnter), and [onDropZoneLeave](https://js.devexpress.com/Documentation/ApiReference/UI_Components/dxFileUploader/Configuration/#onDropZoneLeave) are implemented to allow users to drag and drop files.

## Run the Example

### Angular, React, Vue, and jQuery

1. **Start the Chat Server**
    Execute the following command to start the Chat server:

    ```bash
    cd ChatServer
    dotnet run
    ```

    The server is available at the following URL: `http://localhost:5005`.

2. **Run the Client Application**
    Execute one of the following commands to run the client application:
   
    - **Angular:** `cd Angular && npm install && npm start`
    - **React:** `cd React && npm install && npm run dev`
    - **Vue:** `cd Vue && npm install && npm run dev`
    - **jQuery:** `cd jQuery && npm install && npm start`

### ASP.NET Core

Our ASP.NET Core example includes a standalone Chat server. Run the following command to start the client application and server:

```bash
cd "ASP.NET Core"
dotnet run
```

## Files to Review

- *Chat Server*
    - [Program.cs](ChatServer/Program.cs) - AI Agents and Workflows configuration
    - [ChatController.cs](ChatServer/Controllers/ChatController.cs) - Handles chat API endpoints for communicating with AI agents
    - [DataService.cs](ChatServer/Services/DataService.cs) - Manages data persistence and retrieval for chat messages
- **Angular**
    - [app.component.html](Angular/src/app/app.component.html)
    - [app.component.ts](Angular/src/app/app.component.ts)
    - [app.service.ts](Angular/src/app/app.service.ts)
- **React**
    - [ChatApp.tsx](React/src/components/App.tsx)
    - [MessageTemplate.tsx](React/src/components/MessageTemplate.tsx)
    - [ChatService.ts](React/src/ChatService.ts)
- **Vue**
    - [ChatInterface.vue](Vue/src/components/ChatInterface.vue)
    - [helpers.ts](Vue/src/helpers.ts)
- **jQuery**
    - [index.js](jQuery/src/index.js)
- **ASP.NET Core**    
    - [Index.cshtml](ASP.NET%20Core/Views/Home/Index.cshtml)
    - [ChatController.cs](ASP.NET%20Core/Controllers/ChatController.cs)
    - [Program.cs](ASP.NET%20Core/Program.cs)

## Documentation

- [Getting Started with Chat](https://js.devexpress.com/Documentation/Guide/UI_Components/Chat/Getting_Started_with_Chat/)
- [Chat - Integrate with AI Service](https://js.devexpress.com/Documentation/Guide/UI_Components/Chat/Integrate_with_AI_Service/)

## More Examples

- [DevExtreme Chat - Integration with OpenAI](https://github.com/DevExpress-Examples/devextreme-chat-openai-integration)

<!-- feedback -->
## Does this example address your development requirements/objectives?

[<img src="https://www.devexpress.com/support/examples/i/yes-button.svg"/>](https://www.devexpress.com/support/examples/survey.xml?utm_source=github&utm_campaign=devextreme-chat-ai-integration-ms-agent-framework&~~~was_helpful=yes) [<img src="https://www.devexpress.com/support/examples/i/no-button.svg"/>](https://www.devexpress.com/support/examples/survey.xml?utm_source=github&utm_campaign=devextreme-chat-ai-integration-ms-agent-framework&~~~was_helpful=no)

(you will be redirected to DevExpress.com to submit your response)
<!-- feedback end -->
