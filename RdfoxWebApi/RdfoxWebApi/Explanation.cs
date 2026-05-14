using Newtonsoft.Json;
public class Explanation
{
    [JsonProperty("facts")]
    public Dictionary<string, Fact> Facts { get; set; } = new Dictionary<string, Fact>();  // Initialize to prevent null reference
}
