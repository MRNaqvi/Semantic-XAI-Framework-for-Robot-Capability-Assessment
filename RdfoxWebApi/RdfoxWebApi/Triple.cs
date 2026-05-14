using VDS.RDF;
using VDS.RDF.Parsing;

public class Triple
{
    public string Subject { get; set; }
    public string Predicate { get; set; }
    public string Object { get; set; }

    public Triple(string subject, string predicate, string obj)
    {
        Subject = subject;
        Predicate = predicate;
        Object = obj;
    }
}