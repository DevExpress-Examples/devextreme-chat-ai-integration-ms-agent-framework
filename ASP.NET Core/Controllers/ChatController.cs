using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using ASP.NET_Core.Models;
using ASP.NET_Core.Services;
using Microsoft.Agents.AI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;

namespace ASP.NET_Core.Controllers;

public class ChatController: Controller {

    protected DataService _dataService;

    public ChatController(DataService dataService) {
        _dataService = dataService;
    }

    [HttpPost]
    public async Task<IActionResult> GetAIResponse(
        [FromKeyedServices("VirtualAssistant")] AIAgent virtualAssistant,
        [FromForm] ClientChatMessage message,
        [FromQuery] bool regenerate = false
    ) {
        List<ChatMessage> messages = regenerate
            ? _dataService.RemoveLastMessage()
            : _dataService.AddUserMessage(message);

        var response = await virtualAssistant.RunAsync(messages);
        var updatedMessages = _dataService.AddAssistantMessage(response.Messages[^1]);
        var lastMessage = updatedMessages[^1];

        return Json(ToClientMessage(lastMessage));
    }

    [HttpGet]
    public IActionResult GetUserMessages() {
        var result = _dataService.GetMessages();
        return Json(ToClientMessages(result));
    }

    protected IEnumerable<ClientChatMessage> ToClientMessages(List<ChatMessage> messages) => messages.Select(ToClientMessage);

    protected ClientChatMessage ToClientMessage(ChatMessage m) {
        var clientMessage = new ClientChatMessage {
            Author = new ChatAuthor {
                Id = m.Role.Value,
                Name = m.Role == ChatRole.User ? "User" : "Virtual Assistant",
            },
            Id = m.MessageId,
            Text = m.Text,
            Timestamp = m.CreatedAt?.ToUniversalTime().ToString("o")
        };

        if(m.AdditionalProperties?.TryGetValue("attachments", out var attachmentsValue) == true) {
            if(attachmentsValue is ChatAttachment[] attachments) {
                clientMessage.Attachments = attachments;
            } else if(attachmentsValue is JsonElement jsonElement) {
                clientMessage.Attachments = jsonElement.Deserialize<ChatAttachment[]>();
            }
        }

        return clientMessage;
    }
}
