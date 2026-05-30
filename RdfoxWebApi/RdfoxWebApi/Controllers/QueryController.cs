using AngleSharp.Io;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using Microsoft.AspNetCore.Mvc;
using Numpy;
using System;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using VDS.RDF.Query;
using VDS.RDF.Query.Algebra;
using System.Dynamic;
using static RdfoxWebApi.Controllers.QueryController;
using System.Text.Json;
using System.Net.Sockets;
using Microsoft.AspNetCore.Http.HttpResults;
using VDS.RDF.Parsing;
using VDS.RDF;
using System.Text;
using Microsoft.AspNetCore.Components.Forms;
using Keras.Layers;


namespace RdfoxWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QueryController : ControllerBase
    {
        private readonly RDFoxClient _rdfClient;
        private readonly OpenAIClient _openAIClient;
      
        public QueryController(RDFoxClient rdfClient, OpenAIClient openAIClient)
        {
            _rdfClient = rdfClient;
            _openAIClient = openAIClient;
          
        }


        [Route("Select")]
        [HttpPost]
        public async Task<IActionResult> QueryDataAsync(QueryParam queryparam)

        {
            Console.WriteLine("Enter the SPARQL query (type 'END' on a new line to finish):");
            //string query = ReadMultilineInput();

            string query = Uri.UnescapeDataString(queryparam.p_query);
            if (string.IsNullOrEmpty(query))
            {
                Console.WriteLine("No query entered. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(query, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

            string dataStore = queryparam.store_name;
            if (string.IsNullOrEmpty(dataStore))
            {
                Console.WriteLine("No data store name entered. Operation aborted.");
                return StatusCode(StatusCodes.Status500InternalServerError, dataStore);
            }

            //string query = "SELECT ?robot WHERE { ?robot rdf:type ?o .}";
            //  string query = "SELECT ?robot ?precision WHERE { ?robot rdf:type :robot . ?robot :hasCapability ?cap . ?cap rdf:type :OperationalPrecisionCapability . ?cap :hasValue ?precision .  FILTER(?precision < 0.05)}";
            // string query = "SELECT ?s ?p ?o WHERE {?s ?p ?o}";
            // Extract the string between SELECT and WHERE
            string selectPart = ExtractBetween(query, "SELECT", "WHERE");

            // Split the selectPart into different words by a delimiter (space in this case)
            string[] words = selectPart.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

            string[] finalWords = EnsureArraySize3(words);

            // Output the result
            foreach (string word in finalWords)
            {
                Console.WriteLine(word);
            }
            // Output the result

            static string ExtractBetween(string text, string start, string end)
            {
                int startIndex = text.IndexOf(start) + start.Length;
                int endIndex = text.IndexOf(end);

                if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex)
                {
                    throw new ArgumentException("The specified start or end string is not found in the text, or they are in incorrect order.");
                }

                return text.Substring(startIndex, endIndex - startIndex).Trim();
            }

            static string[] EnsureArraySize3(string[] words)
            {
                string[] result = new string[3];
                for (int i = 0; i < 3; i++)
                {
                    result[i] = (i < words.Length && !string.IsNullOrEmpty(words[i])) ? words[i] : "0";
                }
                return result;
            }


            try
            {
                await _rdfClient.EnsureDataStoreAsync(dataStore);
                var response = await _rdfClient.ExecuteQueryAsync(dataStore, query);

                var (results, querySummary) = ConvertToObjects(response, finalWords[0], finalWords[1], finalWords[2]);

                //  var responseObject = ApiResponse<object>.Success($"{response.Length} Record(s) Loaded Successfully", response);

                // Serialize responseObject to JSON string with proper formatting
                //  string jsonResponse = JsonConvert.SerializeObject(responseObject, Formatting.Indented);

                // Return cleaned JSON response
                var responseData = new
                {
                    queryResult = results,
                    querySummary = querySummary
                };


                return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseData, "List", responseData.queryResult.Count));

            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query data. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }
        }

        [Route("FactExplain")]
        [HttpPost]
        public async Task<IActionResult> ExplainFactDerivationAsync(QueryFact queryFact)
        {
            Console.WriteLine("Enter the data store name:");
            string dataStore = queryFact.store_name;
            if (string.IsNullOrEmpty(dataStore))
            {
                Console.WriteLine("No data store name entered. Operation aborted.");
                return StatusCode(StatusCodes.Status500InternalServerError, dataStore);
            }

            Console.WriteLine("Enter the fact for which you want an explanation:");
            string fact = queryFact.fact_query;
            if (string.IsNullOrEmpty(fact))
            {
                Console.WriteLine("No fact entered. Operation aborted.");
                return StatusCode(StatusCodes.Status500InternalServerError, fact);
            }

            Console.WriteLine("Enter the type of explanation (shortest, to-explicit, exhaustive):");
            string explanationType = queryFact.explanation_type;

            try
            {
                string explanationJson = await _rdfClient.ExplainFactDerivationAsync(dataStore, fact, explanationType);
                Console.WriteLine("Raw JSON Received: ");
                Console.WriteLine(explanationJson);

                PresentFactDerivation(explanationJson);

                // Parse the raw JSON response
                var parsedResponse = JsonDocument.Parse(explanationJson);


                string initialPrompt = $@"You are explaining an S-XAI robot suitability result for manufacturing.

Use only the RDFox explanation JSON below.
Write a short natural language explanation for a human manufacturing user.
Mention the selected robot fact, the operational repeatability or precision value used by the rule, and why the Datalog/RDFox rule supports the result.
Do not explain JSON, prefixes, or RDF syntax.
Do not invent facts, robots, coordinates, or measurements that are not present in the JSON.

RDFox explanation JSON:
{explanationJson}";
                 string additionalExplanation = await _openAIClient.GetExplanationAsync(initialPrompt, queryFact.openai_api_key);
              // string additionalExplanation = "additionalExplanation";

                var responseObject = new
                {
                    originalResponse = parsedResponse.RootElement,
                    additionalExplanation = additionalExplanation
                };

                // Serialize the combined response to JSON
                string combinedResponseJson = System.Text.Json.JsonSerializer.Serialize(responseObject);
                Console.WriteLine("Additional Explanation from OpenAI: ");
                Console.WriteLine(additionalExplanation);

                return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseObject, "List", 0));



                /* // Use OpenAI to get an additional explanation
                 string initialPrompt = $"Given the following JSON explanation, provide a detailed and understandable explanation for the fact derivation:\n\n{explanationJson}";
                 string additionalExplanation = await openAIClient.GetExplanationAsync(initialPrompt);
                 Console.WriteLine("Additional Explanation from OpenAI: ");
                 Console.WriteLine(additionalExplanation);

                 // Allow user to ask follow-up questions
                 while (true)
                 {
                     Console.WriteLine("You can ask a follow-up question or type 'exit' to quit:");
                     string userQuestion = Console.ReadLine() ?? string.Empty;
                     if (userQuestion.ToLower() == "exit")
                     {
                         break;
                     }

                     string followUpResponse = await openAIClient.GetExplanationAsync(userQuestion);
                     Console.WriteLine("Response from OpenAI: ");
                     Console.WriteLine(followUpResponse);
                 }*/
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to explain fact derivation. Status Code: {(int)ex.StatusCode}");
                }
                else
                {
                    Console.WriteLine("Failed to explain fact derivation. Status Code: Unknown");
                }
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to explain fact derivation. Error: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);

            }
        }


        [Route("FactExplainRaw")]
        [HttpPost]
        public async Task<IActionResult> ExplainFactDerivationRawAsync(QueryFact queryFact)
        {
            string dataStore = queryFact.store_name;
            if (string.IsNullOrEmpty(dataStore))
            {
                return StatusCode(StatusCodes.Status500InternalServerError, dataStore);
            }

            string fact = queryFact.fact_query;
            if (string.IsNullOrEmpty(fact))
            {
                return StatusCode(StatusCodes.Status500InternalServerError, fact);
            }

            string explanationType = queryFact.explanation_type;

            try
            {
                string explanationJson = await _rdfClient.ExplainFactDerivationAsync(dataStore, fact, explanationType);
                var parsedResponse = JsonDocument.Parse(explanationJson);

                var responseObject = new
                {
                    originalResponse = parsedResponse.RootElement
                };

                return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseObject, "List", 0));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to explain fact derivation without OpenAI. Error: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }


        [Route("Insert")]
        [HttpPost]
        public async Task<IActionResult> InsertDataAsync(QueryParam queryparam)

        {
            Console.WriteLine("Enter the SPARQL query (type 'END' on a new line to finish):");
            //string query = ReadMultilineInput();

            string query = Uri.UnescapeDataString(queryparam.p_query);
            if (string.IsNullOrEmpty(query))
            {
                Console.WriteLine("No query entered. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(query, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

            //  query = "INSERT DATA {:Robot1 rdf:type :robot .:Robot1 :hasCapability :Capability1 .:Capability1 rdf:type :OperationalPrecisionCapability .:Capability1 :hasValue \"0.03\"^^xsd:decimal .}";
            //query=Uri.UnescapeDataString(query);
            try
            {
                await _rdfClient.EnsureDataStoreAsync(queryparam.store_name);
                await _rdfClient.ExecuteUpdateAsync(queryparam.store_name, query, "sparql");

                /*  var (results, querySummary) = ConvertToObjects(response, finalWords[0], finalWords[1], finalWords[2]);

                  //  var responseObject = ApiResponse<object>.Success($"{response.Length} Record(s) Loaded Successfully", response);

                  // Serialize responseObject to JSON string with proper formatting
                  //  string jsonResponse = JsonConvert.SerializeObject(responseObject, Formatting.Indented);

                  // Return cleaned JSON response
                  var responseData = new
                  {
                      queryResult = results,
                      querySummary = querySummary
                  };


                  return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseData, "List", responseData.queryResult.Count));*/
                var response1 = ApiResponse.CreatResponse("Success", "", "Add", 0);
                return StatusCode(StatusCodes.Status200OK, response1);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query data. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse("Failed", "", "Add", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }
        }

        [Route("Delete")]
        [HttpPost]
        public async Task<IActionResult> DeleteDataAsync(QueryParam queryparam)

        {
            Console.WriteLine("Enter the SPARQL query (type 'END' on a new line to finish):");
            //string query = ReadMultilineInput();

            string query = Uri.UnescapeDataString(queryparam.p_query);
            if (string.IsNullOrEmpty(query))
            {
                Console.WriteLine("No query entered. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(query, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

            query = "DELETE DATA {:Robot1 rdf:type :robot .:Robot1 :hasCapability :Capability1 .:Capability1 rdf:type :OperationalPrecisionCapability .:Capability1 :hasValue \"0.03\"^^xsd:decimal .}";
            query = Uri.UnescapeDataString(query);
            try
            {
                await _rdfClient.ExecuteUpdateAsync(queryparam.store_name, query, "sparql");

                /*  var (results, querySummary) = ConvertToObjects(response, finalWords[0], finalWords[1], finalWords[2]);

                  //  var responseObject = ApiResponse<object>.Success($"{response.Length} Record(s) Loaded Successfully", response);

                  // Serialize responseObject to JSON string with proper formatting
                  //  string jsonResponse = JsonConvert.SerializeObject(responseObject, Formatting.Indented);

                  // Return cleaned JSON response
                  var responseData = new
                  {
                      queryResult = results,
                      querySummary = querySummary
                  };


                  return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseData, "List", responseData.queryResult.Count));*/
                var response1 = ApiResponse.CreatResponse("Success", "", "Delete", 0);
                return StatusCode(StatusCodes.Status200OK, response1);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query data. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse("Failed", "", "Delete", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }
        }

        [Route("RunRule")]
        [HttpPost]
        public async Task<IActionResult> AddDatalogRuleAsync(QueryParam queryparam)

        {

            Console.WriteLine("Enter the data store name:");
            string dataStore = queryparam.store_name;
            if (string.IsNullOrWhiteSpace(dataStore))
            {
                Console.WriteLine("Data store name is required. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(dataStore, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1); ;
            }


            string rule = queryparam.p_query.ToString();
            if (string.IsNullOrWhiteSpace(dataStore))
            {
                Console.WriteLine("Data store name is required. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(rule, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1); ;
            }

            string prefix = "";
            if (!string.IsNullOrWhiteSpace(rule))
            {
                var lines = rule.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 0)
                {
                    prefix = lines[0];
                }
            }
            

            try
            {
                await _rdfClient.EnsureDataStoreAsync(dataStore);
                // Fetch current triples before adding the rule
                Console.WriteLine("Fetching current triples...");
                var currentResponse = await _rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response before adding rule: {currentResponse}");
                var currentTriples = _rdfClient.ParseTriplesFromResponse1(currentResponse);
                Console.WriteLine($"Parsed {currentTriples.Count} triples before adding rule.");
                foreach (var triple in currentTriples)
                {
                    Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                }

                // Add the Datalog rule
                Console.WriteLine("Adding Datalog rule...");
                await _rdfClient.AddDatalogRuleAsync(dataStore, rule);
                Console.WriteLine("Datalog rule successfully added.");

                // Fetch updated triples after adding the rule
                Console.WriteLine("Fetching updated triples...");
                var updatedResponse = await _rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response after adding rule: {updatedResponse}");
                var updatedTriples = _rdfClient.ParseTriplesFromResponse1(updatedResponse);
                Console.WriteLine($"Parsed {updatedTriples.Count} triples after adding rule.");
                foreach (var triple in updatedTriples)
                {
                    Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                }

                // Determine the new triples by counting the difference
                int newTriplesCount = updatedTriples.Count - currentTriples.Count;
                if (newTriplesCount > 0)
                {
                    var newTriples = updatedTriples.Skip(updatedTriples.Count - newTriplesCount).ToList();
                    Console.WriteLine($"Number of new triples added: {newTriplesCount}");
                    Console.WriteLine("New triples added:");
                    FactObject factObject = new FactObject();

                    foreach (var triple in newTriples)
                    {
                        Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                        string fact = FormatFact(triple);
                        Console.WriteLine($"Fact added: {fact}");
                        factObject.Facts.Add(fact);
                    }
                    var response1 = ApiResponse.CreatResponse("Success", factObject, "Add", 0);
                    return StatusCode(StatusCodes.Status200OK, response1);
                }
                else
                {
                    Console.WriteLine("No new triples were added following the rule addition.");

                    var response1 = ApiResponse.CreatResponse("No new triples were added following the rule addition.", "", "List", 0);
                    return StatusCode(StatusCodes.Status200OK, response1);
                }
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to Compare file. Status Code: {(int)ex.StatusCode}");
                    var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                    return StatusCode(StatusCodes.Status500InternalServerError, response1);
                }
                else
                {
                    Console.WriteLine("Failed to Upolad rule . Status Code: Unknown");
                    var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                    return StatusCode(StatusCodes.Status500InternalServerError, response1);
                }
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to add rule and compare triples. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);

            }


        }

        [Route("UploadRule")]
        [HttpPost]
        public async Task<IActionResult> UploadFileAsync(UploadFile uploadFile)

        {
            Console.WriteLine("Enter the file path to the TTL file:");
            string filePath = uploadFile.filePath ?? string.Empty;
            Console.WriteLine("Enter the datastore name:");
            string datastore = uploadFile.storeName ?? string.Empty;
            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = uploadFile.graphName ?? string.Empty;

            if (string.IsNullOrEmpty(filePath) || string.IsNullOrEmpty(datastore))
            {
                Console.WriteLine("File path and datastore name are required. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(filePath, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1); ;
            }

            try
            {
                await _rdfClient.EnsureDataStoreAsync(datastore);
                // Fetch current triples before uploading the file
                Console.WriteLine("Fetching current triples...");
                var currentResponse = await _rdfClient.ExecuteQueryAsync(datastore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response before upload: {currentResponse}");
                var currentTriples = _rdfClient.ParseTriplesFromResponse1(currentResponse);
                Console.WriteLine($"Parsed {currentTriples.Count} triples before upload.");
                PrintTriples(currentTriples);

                // Upload the file
                Console.WriteLine("Uploading file...");
                byte[] fileBytes = Convert.FromBase64String(uploadFile.filePath);
                await _rdfClient.UploadFileAsync(datastore, fileBytes, graphName);
                Console.WriteLine("File successfully uploaded.");

                // Fetch updated triples after uploading the file
                Console.WriteLine("Fetching updated triples...");
                var updatedResponse = await _rdfClient.ExecuteQueryAsync(datastore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response after upload: {updatedResponse}");
                var updatedTriples = _rdfClient.ParseTriplesFromResponse1(updatedResponse);
                Console.WriteLine($"Parsed {updatedTriples.Count} triples after upload.");
                PrintTriples(updatedTriples);

                // Determine the new triples by counting the difference
                int newTriplesCount = updatedTriples.Count - currentTriples.Count;
                if (newTriplesCount > 0)
                {
                    var newTriples = updatedTriples.Skip(updatedTriples.Count - newTriplesCount).ToList();
                    Console.WriteLine($"Number of new triples added: {newTriplesCount}");
                    Console.WriteLine("New triples added:");
                    FactObject factObject = new FactObject();

                    foreach (var triple in newTriples)
                    {
                        Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                        string fact = FormatFact(triple);
                        Console.WriteLine($"Fact added: {fact}");
                        factObject.Facts.Add(fact);
                    }
                    var response1 = ApiResponse.CreatResponse("Success", factObject, "Add", 0);
                    return StatusCode(StatusCodes.Status200OK, response1);
                }
                else
                {
                    Console.WriteLine("No new triples were added following the upload.");
                    var response1 = ApiResponse.CreatResponse("No new triples were added following the upload.", "", "List", 0);
                    return StatusCode(StatusCodes.Status200OK, response1);
                }
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to upload file. Status Code: {(int)ex.StatusCode}");
                    var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                    return StatusCode(StatusCodes.Status500InternalServerError, response1);
                }
                else
                {
                    Console.WriteLine("Failed to upload file. Status Code: Unknown");
                    var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                    return StatusCode(StatusCodes.Status500InternalServerError, response1);
                }
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to upload file. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

        }

        [Route("UploadTTL")]
        [HttpPost]
        public async Task<IActionResult> LoadTtlFileAsync(UploadFile uploadFile)

        {
            Console.WriteLine("Enter the file path to the TTL file:");
            string filePath = uploadFile.filePath ?? string.Empty;
            Console.WriteLine("Enter the datastore name:");
            string datastore = uploadFile.storeName ?? string.Empty;
            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = uploadFile.graphName ?? string.Empty;

            if (string.IsNullOrEmpty(filePath) || string.IsNullOrEmpty(datastore))
            {
                Console.WriteLine("File path and datastore name are required. Operation aborted.");
                var response1 = ApiResponse.CreatResponse(filePath, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1); ;
            }


            try
            {
                await _rdfClient.EnsureDataStoreAsync(datastore);
                /* // Parse TTL file and print prefixes
                 IGraph graph = new Graph();
                 TurtleParser parser = new TurtleParser();
                 parser.Load(graph, filePath);*/

                /*Console.WriteLine("Prefixes in the ontology:");
                foreach (var prefix in graph.NamespaceMap.Prefixes)
                {
                    Console.WriteLine($"{prefix}: {graph.NamespaceMap.GetNamespaceUri(prefix)}");
                }*/

                // Upload TTL file
                byte[] fileBytes = Convert.FromBase64String(uploadFile.filePath);
                await _rdfClient.UploadTTLFileAsync(datastore, fileBytes, graphName);
                var response1 = ApiResponse.CreatResponse("Success", "", "Add", 0);
                return StatusCode(StatusCodes.Status200OK, response1);
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                    return StatusCode(StatusCodes.Status500InternalServerError, response1);
                }
                else
                {
                    var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                    return StatusCode(StatusCodes.Status500InternalServerError, response1);
                }

            }
            catch (Exception ex)
            {
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "List", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

        }
        [Route("AskQuestion")]
        [HttpPost]
        public async Task<IActionResult> AskQuestionAsync(QueryParam queryparam)
        {

            string fact = queryparam.p_query;
            if (string.IsNullOrEmpty(fact))
            {
                Console.WriteLine("No Query entered. Operation aborted.");
                return StatusCode(StatusCodes.Status500InternalServerError, fact);
            }


            try
            {




                string additionalExplanation = await _openAIClient.GetExplanationAsync(fact);

                /*  var responseObject = new
                  {
                      originalResponse = parsedResponse.RootElement,
                      additionalExplanation = additionalExplanation
                  };

                  // Serialize the combined response to JSON
                  string combinedResponseJson = System.Text.Json.JsonSerializer.Serialize(responseObject);
                  Console.WriteLine("Additional Explanation from OpenAI: ");
                  Console.WriteLine(additionalExplanation);*/

                var responseObject = new
                {

                    additionalExplanation = additionalExplanation
                };

                return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseObject, "List", 0));



                /* // Use OpenAI to get an additional explanation
                 string initialPrompt = $"Given the following JSON explanation, provide a detailed and understandable explanation for the fact derivation:\n\n{explanationJson}";
                 string additionalExplanation = await openAIClient.GetExplanationAsync(initialPrompt);
                 Console.WriteLine("Additional Explanation from OpenAI: ");
                 Console.WriteLine(additionalExplanation);

                 // Allow user to ask follow-up questions
                 while (true)
                 {
                     Console.WriteLine("You can ask a follow-up question or type 'exit' to quit:");
                     string userQuestion = Console.ReadLine() ?? string.Empty;
                     if (userQuestion.ToLower() == "exit")
                     {
                         break;
                     }

                     string followUpResponse = await openAIClient.GetExplanationAsync(userQuestion);
                     Console.WriteLine("Response from OpenAI: ");
                     Console.WriteLine(followUpResponse);
                 }*/
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to explain fact derivation. Status Code: {(int)ex.StatusCode}");
                }
                else
                {
                    Console.WriteLine("Failed to explain fact derivation. Status Code: Unknown");
                }
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to explain fact derivation. Error: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);

            }
        }

        [Route("CreateDataStore")]
        [HttpPost]
        public async Task<IActionResult> CreateDataStoreAsync(CreateStore querystore)

        {

            Console.WriteLine("Enter the name of the datastore to create:");
            string dataStoreName = querystore.storeName;
            if (string.IsNullOrEmpty(dataStoreName))
            {
                Console.WriteLine("No Query entered. Operation aborted.");
                return StatusCode(StatusCodes.Status500InternalServerError, dataStoreName);
            }
            if (string.IsNullOrEmpty(querystore.storePassword))
            {
                Console.WriteLine("No Query entered. Operation aborted.");
                return StatusCode(StatusCodes.Status500InternalServerError, querystore.storePassword);
            }
            try
            {
                await _rdfClient.CreateDataStoreAsync(dataStoreName);
                Console.WriteLine($"Datastore '{dataStoreName}' created successfully.");

                Console.WriteLine($"Enter the password for the {dataStoreName}-admin role:");
                string password = querystore.storePassword;

                await _rdfClient.CreateRoleAsync($"{dataStoreName}-admin", password);
                Console.WriteLine($"Role '{dataStoreName}-admin' created successfully.");

                var privileges = new List<string>
        {
            $"active {dataStoreName}",
            $"grant privileges write |roles to {dataStoreName}-admin",
            $"grant privileges grant |roles to {dataStoreName}-admin",
            $"grant privileges read |roles to {dataStoreName}-admin",
            $"grant privileges full |datastores|{dataStoreName} to {dataStoreName}-admin",
            $"grant privileges read |datastores to {dataStoreName}-admin",
            $"grant privileges write |datastores to {dataStoreName}-admin",
            $"grant privileges grant |datastores to {dataStoreName}-admin",
            $"grant privileges read,write,grant |datastores|{dataStoreName}|rules to {dataStoreName}-admin",
            $"grant privileges read,write,grant |datastores|{dataStoreName}|axioms to {dataStoreName}-admin",
            $"grant privileges read,write,grant |datastores|{dataStoreName}|commitprocedure to {dataStoreName}-admin",
            $"grant privileges read,write,grant |datastores|{dataStoreName}|datasources to {dataStoreName}-admin",
            $"grant privileges read,write,grant |datastores|{dataStoreName}|tupletables to {dataStoreName}-admin",
            $"grant privileges read,write,grant |datastores|{dataStoreName}|namedgraphs|<graph-name> to {dataStoreName}-admin",
            //"role show {dataStoreName}-admin"//
        };

                foreach (var privilege in privileges)
                {
                    string response = await _rdfClient.ExecuteCommandAsync(privilege);
                    Console.WriteLine($"Command '{privilege}' executed successfully as {response}.");
                }

                Console.WriteLine($"Privileges granted to '{dataStoreName}-admin' successfully.");
                var response1 = ApiResponse.CreatResponse("Success", "", "Add", 0);
                return StatusCode(StatusCodes.Status200OK, response1);
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Failed to create datastore. Status Code: {ex.StatusCode}");
                Console.WriteLine($"Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "Add", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to create datastore. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "Add", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }

        }

        [Route("ListDataStore")]
        [HttpGet]
        public async Task<IActionResult> ListDataStoresAsync()
        {
            Console.WriteLine("Sending request to list data stores...");
            try
            {
                var dataStores = await _rdfClient.ListDataStoresAsync();
                Console.WriteLine("Data Stores:");
                Console.WriteLine(dataStores);


                var dataStoreList = ParseQueryResult(dataStores);

                var responseData = new
                {
                    queryResult = dataStoreList
                };

                return StatusCode(StatusCodes.Status200OK, ApiResponse.CreatResponse("", responseData, "List", dataStoreList.Count));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to list data stores. Error: {ex.Message}");
                var response1 = ApiResponse.CreatResponse(ex.Message, "", "Add", 0);
                return StatusCode(StatusCodes.Status500InternalServerError, response1);
            }
        }
/*
        [Route("ModelExplain")]
        [HttpPost]
        public async Task<IActionResult> ExplainModelAsync([FromBody] InputDataModel model)
        {
*//*
            try
            {
                var result = _modelService.Predict(model.inputData);
                return Ok(new { prediction = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }*//*

            try
            {
                if (model == null ||model.inputData.Length==0)
                {
                    return BadRequest("Input data is required.");
                }

                NDarray input = _modelService.PrepareInput(model.inputData);
                NDarray result = _modelService.Predict(input);

                return Ok(result.ToString());
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
*/
        private List<DataStore> ParseQueryResult(string queryResult)
        {
            var dataStoreList = new List<DataStore>();
            var lines = queryResult.Split('\n');

            // Skip the header line and parse the rest
            foreach (var line in lines.Skip(1))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;

                var columns = line.Split('\t');
                var dataStore = new DataStore
                {
                    Name = columns[0].Trim('"'),
                    UniqueID = columns[1].Trim('"'),
                    Persistent = bool.Parse(columns[2]),
                    Online = bool.Parse(columns[3]),
                    Parameters = columns[4].Trim('"')
                };
                dataStoreList.Add(dataStore);
            }

            return dataStoreList;
        }


        private (List<dynamic> results, QuerySummary querySummary) ConvertToObjects(string responseBody, string word1, string word2, string word3)
        {

            var jsonArray = JArray.Parse(responseBody);
            var results = new List<dynamic>();


            var querySummary = new QuerySummary
            {
                queryName1 = word1,
                queryName2 = word2,
                queryName3 = word3
            };
            foreach (var item in jsonArray)
            {
                dynamic result = new ExpandoObject();
                var dict = (IDictionary<string, object>)result;
                dict["word1"] = item[word1]?.ToString();
                dict["word2"] = item[word2]?.ToString();
                dict["word3"] = item[word3]?.ToString();

                results.Add(result);
            }


            return (results, querySummary);


        }
        private static void PresentFactDerivation(string explanationJson)
        {
            try
            {
                var deserializedResponse = JsonConvert.DeserializeObject<Dictionary<string, dynamic>>(explanationJson);
                if (deserializedResponse == null)
                {
                    Console.WriteLine("Deserialization failed. The response is null.");
                    return;
                }

                Console.WriteLine("Deserialization successful.");

                // Print the prefixes
                if (deserializedResponse.ContainsKey("prefixes") && deserializedResponse["prefixes"] != null)
                {
                    Console.WriteLine("Prefixes:");
                    foreach (var prefix in deserializedResponse["prefixes"])
                    {
                        Console.WriteLine($"{prefix.Name}: {prefix.Value}");
                    }
                }
                else
                {
                    Console.WriteLine("No prefixes available.");
                }

                // Process and print the facts and rules
                if (deserializedResponse.ContainsKey("facts") && deserializedResponse["facts"] != null)
                {
                    Console.WriteLine("Processing facts...");
                    foreach (var factEntry in deserializedResponse["facts"])
                    {
                        var fact = factEntry.Value;
                        string factString = fact["fact"];
                        string factType = fact["type"];
                        string ruleString = string.Empty;

                        // Check if rule instances are available
                        if (fact["rule-instances"] != null && fact["rule-instances"].Count > 0)
                        {
                            // Get the rule information
                            var ruleInstance = fact["rule-instances"][0];
                            ruleString = ruleInstance["rule"].ToString();

                            // Check if grounded-rule-structured is available
                            string groundedRule = ruleInstance["grounded-rule-structured"]?.ToString() ?? string.Empty;
                            if (!string.IsNullOrEmpty(groundedRule))
                            {
                                ruleString += $"\nGrounded rule: {groundedRule}";
                            }
                        }

                        Console.WriteLine($"Fact: {factString}");
                        if (!string.IsNullOrEmpty(ruleString))
                        {
                            Console.WriteLine($"Derived by rule: {ruleString}");
                        }
                        else
                        {
                            Console.WriteLine("No rule information available.");
                        }
                    }
                }
                else
                {
                    Console.WriteLine("No facts available.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to present fact derivation. Error: {ex.Message}");
            }
        }
        private static void PrintTriples(IEnumerable<Triple> triples)
        {
            foreach (var triple in triples)
            {
                Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
            }
        }

        public class InputDataModel
        {
            public float[] inputData { get; set; }
        }
        public class SparqlResult
        {
            public ExpandoObject Fields { get; set; } = new ExpandoObject();
        }

        public class QueryParam
        {
            public string store_name { get; set; }
            public string p_query { get; set; }

        }
        public class QuerySummary
        {
            public string queryName1 { get; set; }
            public string queryName2 { get; set; }
            public string queryName3 { get; set; }
        }

        public class QueryFact
        {
            public string store_name { get; set; }
            public string fact_query { get; set; }
            public string explanation_type { get; set; }
            public string? openai_api_key { get; set; }

        }

        public class UploadFile
        {
            public string filePath { get; set; }
            public string storeName { get; set; }
            public string graphName { get; set; }
        }
        public class CreateStore
        {
            public string storeName { get; set; }
            public string storePassword { get; set; }
        }
        public class DataStore
        {
            public string Name { get; set; }
            public string UniqueID { get; set; }
            public bool Persistent { get; set; }
            public bool Online { get; set; }
            public string Parameters { get; set; }
        }
        public class FactObject
        {
            public List<string> Facts { get; set; }

            public FactObject()
            {
                Facts = new List<string>();
            }
        }


        private static Dictionary<string, string> namespaceMap = new Dictionary<string, string>();
        public static string FormatFact(Triple triple)
        {
            int lastSlashIndex = triple.Object.LastIndexOf('/');
            string objectNamespace = lastSlashIndex != -1 ? triple.Object.Substring(0, lastSlashIndex + 1) : triple.Object;
            int lastSubjectSlashIndex = triple.Subject.LastIndexOf('/');
            string subjectNamespace = lastSubjectSlashIndex != -1 ? triple.Subject.Substring(0, lastSubjectSlashIndex + 1) : triple.Subject;

            string objectLabel = triple.Object.Substring(lastSlashIndex + 1).Trim('<', '>');
            string subjectLabel = triple.Subject.Substring(lastSubjectSlashIndex + 1).Trim('<', '>');

            string objectPrefix;
            string subjectPrefix;

            if (namespaceMap.TryGetValue(objectNamespace, out var objPrefix))
            {
                objectPrefix = objPrefix + objectLabel;
            }
            else
            {
                objectPrefix = objectNamespace + objectLabel;
            }

            if (namespaceMap.TryGetValue(subjectNamespace, out var subjPrefix))
            {
                subjectPrefix = subjPrefix + subjectLabel;
            }
            else
            {
                subjectPrefix = subjectNamespace + subjectLabel;
            }

            // Apply EnsureBrackets to ensure proper bracket formatting
            objectPrefix = EnsureBrackets(objectPrefix);
            subjectPrefix = EnsureBrackets(subjectPrefix);

            return $"{objectPrefix}[{subjectPrefix}]";
        }

        private static string EnsureBrackets(string value)
        {
            // Ensure the value starts with exactly one '<'
            if (!value.StartsWith("<"))
                value = "<" + value;
            else if (value.StartsWith("<<"))
                value = value.Substring(1);

            // Ensure the value ends with exactly one '>'
            if (!value.EndsWith(">"))
                value += ">";
            else if (value.EndsWith(">>"))
                value = value.Substring(0, value.Length - 1);

            return value;
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


    }
}
