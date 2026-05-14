using Newtonsoft.Json;
using System.Collections.Generic;
public class RuleInstance
{
    [JsonProperty("grounded_rule_structured")]
    public string? GroundedRuleStructured { get; set; }  // Allow nullable

    [JsonProperty("body_facts")]
    public List<string>? BodyFacts { get; set; } = new List<string>();  // Initialize to prevent null reference, allow nullable
}

