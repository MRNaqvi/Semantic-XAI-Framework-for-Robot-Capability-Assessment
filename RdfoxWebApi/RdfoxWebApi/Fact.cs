using Newtonsoft.Json;
using System.Collections.Generic;

public class Fact
{
    [JsonProperty("fact")]
    public string FactDetail { get; set; } = "";  // Initialize with default empty string

    [JsonProperty("rule_instances")]
    public List<RuleInstance> RuleInstances { get; set; } = new List<RuleInstance>();  // Initialize to prevent null reference
}