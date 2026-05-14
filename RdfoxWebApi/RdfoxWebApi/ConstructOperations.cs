using System;
using System.Threading.Tasks;

namespace RdfoxWebApi
{
    public static class ConstructOperations
    {
        public static async Task ConstructDataAsync(RDFoxClient rdfClient, string dataStore, string query)
        {
            Console.WriteLine("Constructing data...");
            var response = await rdfClient.ExecuteQueryAsync(dataStore, query);
            Console.WriteLine("Construct Data Response:");
            Console.WriteLine(response);
        }
    }
}
