using AngleSharp.Io;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using Microsoft.AspNetCore.Mvc;

using System;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using VDS.RDF.Query;
using VDS.RDF.Query.Algebra;

namespace RdfoxWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FactController : ControllerBase
    {
        private readonly RDFoxClient _rdfClient;

        public FactController(RDFoxClient rdfClient)
        {
            _rdfClient = rdfClient;
        }

        [HttpGet("{p_query}")]
        public async Task<IActionResult> QueryDataAsync()
        {
            Console.WriteLine("Enter the SPARQL query (type 'END' on a new line to finish):");
            //string query = ReadMultilineInput();



            string query = "SELECT ?robot WHERE { ?robot rdf:type ?o .}";
           // string query = "SELECT ?s ?p ?o WHERE {?s ?p ?o}";
            if (string.IsNullOrEmpty(query))
            {
                Console.WriteLine("No query entered. Operation aborted.");
                var response1 =  ApiResponse.CreatResponse(query, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

            try
            {
                var response = await _rdfClient.ExecuteQueryAsync("ds", query);

                var results = ConvertToObjects(response);

                //  var responseObject = ApiResponse<object>.Success($"{response.Length} Record(s) Loaded Successfully", response);

                // Serialize responseObject to JSON string with proper formatting
                //  string jsonResponse = JsonConvert.SerializeObject(responseObject, Formatting.Indented);

                // Return cleaned JSON response
                return StatusCode(StatusCodes.Status200OK,ApiResponse.CreatResponse("", results, "List", results.Count));

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query data. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }
        }


        private List<SparqlResult> ConvertToObjects(string responseBody)
        {
            var jsonArray = JArray.Parse(responseBody);
            var results = new List<SparqlResult>();

            foreach (var item in jsonArray)
            {
                var result = new SparqlResult
                {
                    S = item["?robot"]?.ToString(),
                    P = item["?p"]?.ToString(),
                    O = item["?o"]?.ToString()
                };

                results.Add(result);
            }

            return results;
        }

       /* private List<SparqlResult> ConvertToObjects(string responseBody)
        
        
        {
            var lines = responseBody.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);

            if (lines.Length == 0)
            {
                return new List<SparqlResult>(); // Return an empty list if there's no data
            }

            var headers = lines[0].Split('\t');
            var results = new List<SparqlResult>();

            for (int i = 1; i < lines.Length; i++)
            {
                var values = lines[i].Split('\t');
                if (values.Length != headers.Length)
                {
                    continue; // Skip malformed lines
                }

                var result = new SparqlResult();
                for (int j = 0; j < headers.Length; j++)
                {
                    // Map values to properties
                    if (headers[j] == "?s") result.s = values[j];
                    if (headers[j] == "?p") result.p = values[j];
                    if (headers[j] == "?o") result.o = values[j];
                }

                results.Add(result);
            }

            return results;
        }*/

        public class SparqlResult
        {
            public string S { get; set; }
            public string P { get; set; }
            public string O { get; set; }
        }

    }
}
