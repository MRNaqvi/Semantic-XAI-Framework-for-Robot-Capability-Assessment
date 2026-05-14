using OpenAI_API;
using OpenAI_API.Chat;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

public class OpenAIClient
{
    private readonly OpenAIAPI _api;
    private readonly bool _enabled;

    public OpenAIClient(string apiKey)
    {
        _enabled = !string.IsNullOrWhiteSpace(apiKey);
        _api = new OpenAIAPI(apiKey);
    }

    private IList<OpenAI_API.Chat.ChatMessage> LoadContext()
    {
        try
        {
            var contextPath = FindResourceFile("chat_context.json");
            if (string.IsNullOrEmpty(contextPath))
            {
                return new List<OpenAI_API.Chat.ChatMessage>();
            }

            var json = File.ReadAllText(contextPath);
            var messages = JsonConvert.DeserializeObject<IList<OpenAI_API.Chat.ChatMessage>>(json) ?? new List<OpenAI_API.Chat.ChatMessage>();
            return messages;
        }
        catch (FileNotFoundException)
        {
            return new List<OpenAI_API.Chat.ChatMessage>(); // Return an empty list if no file exists
        }
    }

    private static string? FindResourceFile(string fileName)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidate = Path.Combine(directory.FullName, "resources", fileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        return null;
    }

    public async Task<string> GetExplanationAsync(string prompt)
    {
        if (!_enabled)
        {
            return "To get natural language explanations, add your OpenAI API key as OPENAI_API_KEY and restart the .NET API. RDFox facts and graph view are still available without it.";
        }

        // Load context from file
        var messages = LoadContext();

        // Add the user's message to the context
        if (!string.IsNullOrWhiteSpace(prompt))
        {
            messages.Add(new OpenAI_API.Chat.ChatMessage(ChatMessageRole.User, prompt));
        }

        var chatRequest = new ChatRequest
        {
            Model = "gpt-4",
            Messages = messages // Directly use the loaded context with the user's message added
        };

        var result = await _api.Chat.CreateChatCompletionAsync(chatRequest);
        var responseMessage = result.Choices.FirstOrDefault()?.Message.TextContent?.Trim() ?? string.Empty;

        return responseMessage;
    }
}
