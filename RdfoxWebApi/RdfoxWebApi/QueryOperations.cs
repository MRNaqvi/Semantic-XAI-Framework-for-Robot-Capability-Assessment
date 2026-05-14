using System;
using System.Threading.Tasks;

namespace RdfoxWebApi
{
    public static class QueryOperations
    {
        public static async Task QueryDataAsync(RDFoxClient rdfClient, string dataStore, string query)
        {
            Console.WriteLine("Querying data from the data store...");
            var response = await rdfClient.ExecuteQueryAsync(dataStore, query);
            Console.WriteLine("Query Data Response:");
            Console.WriteLine(response);
        }
    }
}
