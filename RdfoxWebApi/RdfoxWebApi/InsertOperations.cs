using System;
using System.Threading.Tasks;

namespace RdfoxWebApi
{
    public static class InsertOperations
    {
        public static async Task InsertDataAsync(RDFoxClient rdfClient, string dataStore, string data)
        {
            try
            {
                Console.WriteLine("Inserting data into the data store...");
                await rdfClient.ExecuteUpdateAsync("ds", data, "sparql");
                Console.WriteLine("Insert Data Response: Success");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"An error occurred while inserting data: {ex.Message}");
            }
        }
    }
}

