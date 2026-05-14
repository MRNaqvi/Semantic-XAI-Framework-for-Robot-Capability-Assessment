using OpenAI_API;
using OpenAI_API.Chat;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class ChatMessage
{
    public string Role { get; set; }
    public string Content { get; set; }

    public ChatMessage(string role, string content)
    {
        Role = role;
        Content = content;
    }
}
