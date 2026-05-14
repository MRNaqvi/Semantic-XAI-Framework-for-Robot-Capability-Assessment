using Newtonsoft.Json;
using System.Text;

namespace RdfoxWebApi
{
    public class AllFunction
    {

        static async Task Main(string[] args)
        {
            var baseUri = "http://localhost:12110/";
            var username = "guest";
            var password = "guest";
            var openAIKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? string.Empty;

            var rdfClient = new RDFoxClient(baseUri, username, password);
            var openAIClient = new OpenAIClient(openAIKey);
            while (true)
            {
                Console.WriteLine("Choose an operation:");
                Console.WriteLine("1. List Roles");
                Console.WriteLine("2. List Data Stores");
                Console.WriteLine("3. Insert Data");
                Console.WriteLine("4. Query Data");
                Console.WriteLine("5. Delete Data");
                Console.WriteLine("6. Add Datalog Rule");
                Console.WriteLine("7. Query Inferred Data");
                Console.WriteLine("8. Upload File");
                Console.WriteLine("9. Explain Fact Derivation");
                Console.WriteLine("10. Perform Data Store Operations");
                Console.WriteLine("11. Compare Triples Before and After Upload");
                Console.WriteLine("12. Load SWRL Rules");
                Console.WriteLine("13. Load OWL File");
                Console.WriteLine("14. Load TTL File");
                Console.WriteLine("15. Create Data Store");  // New option for creating a datastore
                Console.WriteLine("16. Exit");

                if (int.TryParse(Console.ReadLine(), out int operation))
                {
                    try
                    {
                        switch (operation)
                        {
                            case 1:
                                await ListRolesAsync(rdfClient);
                                break;
                            case 2:
                                await ListDataStoresAsync(rdfClient);
                                break;
                            case 3:
                                await InsertDataAsync(rdfClient);
                                break;
                            case 4:
                                await QueryDataAsync(rdfClient);
                                break;
                            case 5:
                                await DeleteDataAsync(rdfClient);
                                break;
                            case 6:
                                await AddDatalogRuleAsync(rdfClient);
                                break;
                            case 7:
                                await QueryInferredDataAsync(rdfClient);
                                break;
                            case 8:
                                await UploadFileAsync(rdfClient);
                                break;
                            case 9:
                                await ExplainFactDerivationAsync(rdfClient, openAIClient);
                                break;
                            case 10:
                                await PerformDataStoreOperations(rdfClient, "ds");
                                break;
                            case 11:
                                await CompareTriplesBeforeAndAfterUploadAsync(rdfClient);
                                break;
                            case 12:
                                await LoadSwrlRulesAsync(rdfClient);
                                break;
                            case 13:
                                await LoadOwlFileAsync(rdfClient);
                                break;
                            case 14:
                                await LoadTtlFileAsync(rdfClient);
                                break;
                            case 15:
                                await CreateDataStoreAsync(rdfClient); // Assuming you have this method defined
                                break;
                            case 16:
                                return; // Exit the program
                            default:
                                Console.WriteLine("Invalid operation.");
                                break;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error during operation: {ex.Message}");
                    }
                }
                else
                {
                    Console.WriteLine("Invalid input.");
                }
            }
        }
        private static async Task CreateDataStoreAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the name of the datastore to create:");
            string dataStoreName = Console.ReadLine() ?? string.Empty;

            try
            {
                await rdfClient.CreateDataStoreAsync(dataStoreName);
                Console.WriteLine($"Datastore '{dataStoreName}' created successfully.");

                Console.WriteLine($"Enter the password for the {dataStoreName}-admin role:");
                string password = Console.ReadLine() ?? string.Empty;

                await rdfClient.CreateRoleAsync($"{dataStoreName}-admin", password);
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
                    string response = await rdfClient.ExecuteCommandAsync(privilege);
                    Console.WriteLine($"Command '{privilege}' executed successfully as {response}.");
                }

                Console.WriteLine($"Privileges granted to '{dataStoreName}-admin' successfully.");
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Failed to create datastore. Status Code: {ex.StatusCode}");
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to create datastore. Error: {ex.Message}");
            }
        }

        private static async Task ExplainFactDerivationAsync(RDFoxClient rdfClient, OpenAIClient openAIClient)
        {
            Console.WriteLine("Enter the data store name:");
            string dataStore = Console.ReadLine() ?? string.Empty;
            if (string.IsNullOrEmpty(dataStore))
            {
                Console.WriteLine("No data store name entered. Operation aborted.");
                return;
            }

            Console.WriteLine("Enter the fact for which you want an explanation:");
            string fact = Console.ReadLine() ?? string.Empty;
            if (string.IsNullOrEmpty(fact))
            {
                Console.WriteLine("No fact entered. Operation aborted.");
                return;
            }

            Console.WriteLine("Enter the type of explanation (shortest, to-explicit, exhaustive):");
            string explanationType = Console.ReadLine() ?? "shortest";

            try
            {
                string explanationJson = await rdfClient.ExplainFactDerivationAsync(dataStore, fact, explanationType);
                Console.WriteLine("Raw JSON Received: ");
                Console.WriteLine(explanationJson);

                PresentFactDerivation(explanationJson);

                // Use OpenAI to get an additional explanation
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
                }
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
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to explain fact derivation. Error: {ex.Message}");
            }
        }

        private static async Task ListRolesAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Sending request to list roles...");
            try
            {
                var roles = await rdfClient.ListRolesAsync();
                Console.WriteLine("Roles:");
                Console.WriteLine(roles);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to list roles. Error: {ex.Message}");
            }
        }

        private static async Task ListDataStoresAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Sending request to list data stores...");
            try
            {
                var dataStores = await rdfClient.ListDataStoresAsync();
                Console.WriteLine("Data Stores:");
                Console.WriteLine(dataStores);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to list data stores. Error: {ex.Message}");
            }
        }

        private static async Task InsertDataAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the SPARQL update query to insert data (type 'END' on a new line to finish):");
            string data = ReadMultilineInput();
            if (string.IsNullOrEmpty(data))
            {
                Console.WriteLine("No data entered. Operation aborted.");
                return;
            }

            try
            {
                await rdfClient.ExecuteUpdateAsync("ds", data, "sparql");
                Console.WriteLine("Data successfully inserted.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to insert data. Error: {ex.Message}");
            }
        }

        private static async Task QueryDataAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the SPARQL query (type 'END' on a new line to finish):");
            string query = ReadMultilineInput();
            if (string.IsNullOrEmpty(query))
            {
                Console.WriteLine("No query entered. Operation aborted.");
                return;
            }

            try
            {
                var response = await rdfClient.ExecuteQueryAsync("ds", query);
                Console.WriteLine("Query Data Response:");
                Console.WriteLine(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query data. Error: {ex.Message}");
            }
        }

        private static async Task DeleteDataAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the SPARQL update query to delete data (type 'END' on a new line to finish):");
            string data = ReadMultilineInput();
            if (string.IsNullOrEmpty(data))
            {
                Console.WriteLine("No data entered. Operation aborted.");
                return;
            }

            try
            {
                await rdfClient.ExecuteUpdateAsync("ds", data, "sparql");
                Console.WriteLine("Data successfully deleted.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to delete data. Error: {ex.Message}");
            }
        }

        private static async Task AddDatalogRuleAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the data store name:");
            string dataStore = Console.ReadLine() ?? "ds";
            if (string.IsNullOrWhiteSpace(dataStore))
            {
                Console.WriteLine("Data store name is required. Operation aborted.");
                return;
            }

            Console.WriteLine("Enter the prefix (e.g., PREFIX : <http://MCSK.com/>) (type 'END' on a new line to finish):");
            StringBuilder prefixBuilder = new StringBuilder();
            string line;
            while (!string.IsNullOrEmpty(line = Console.ReadLine() ?? string.Empty) && line != "END")
            {
                prefixBuilder.AppendLine(line);
            }
            string prefix = prefixBuilder.ToString();

            Console.WriteLine("Enter the Datalog rule (type 'END' on a new line to finish):");
            StringBuilder ruleBuilder = new StringBuilder();
            while (!string.IsNullOrEmpty(line = Console.ReadLine() ?? string.Empty) && line != "END")
            {
                ruleBuilder.AppendLine(line);
            }
            string rule = ruleBuilder.ToString();

            try
            {
                // Fetch current triples before adding the rule
                Console.WriteLine("Fetching current triples...");
                var currentResponse = await rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response before adding rule: {currentResponse}");
                var currentTriples = ParseTriplesFromResponse(currentResponse);
                Console.WriteLine($"Parsed {currentTriples.Count} triples before adding rule.");
                foreach (var triple in currentTriples)
                {
                    Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                }

                // Add the Datalog rule
                Console.WriteLine("Adding Datalog rule...");
              //  await rdfClient.AddDatalogRuleAsync(dataStore, prefix, rule);
                Console.WriteLine("Datalog rule successfully added.");

                // Fetch updated triples after adding the rule
                Console.WriteLine("Fetching updated triples...");
                var updatedResponse = await rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response after adding rule: {updatedResponse}");
                var updatedTriples = ParseTriplesFromResponse(updatedResponse);
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
                    foreach (var triple in newTriples)
                    {
                        Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                    }
                }
                else
                {
                    Console.WriteLine("No new triples were added following the rule addition.");
                }
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to add rule and compare triples. Status Code: {(int)ex.StatusCode}");
                }
                else
                {
                    Console.WriteLine("Failed to add rule and compare triples. Status Code: Unknown");
                }
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to add rule and compare triples. Error: {ex.Message}");
            }
        }

        private static async Task QueryInferredDataAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the data store name:");
            string dataStore = Console.ReadLine() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(dataStore))
            {
                Console.WriteLine("Data store name is required. Operation aborted.");
                return;
            }

            try
            {
                Console.WriteLine("Querying inferred data...");
                string inferredQuery = "SELECT ?s ?p ?o WHERE { ?s ?p ?o }";
                var result = await rdfClient.ExecuteQueryAsync(dataStore, inferredQuery);
                Console.WriteLine("Inferred Data Result: " + result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query inferred data. Error: {ex.Message}");
            }
        }

        private static async Task UploadFileAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the file path to upload:");
            string filePath = Console.ReadLine() ?? string.Empty;
            if (string.IsNullOrEmpty(filePath))
            {
                Console.WriteLine("No file path entered. Operation aborted.");
                return;
            }

            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = Console.ReadLine() ?? string.Empty;

            try
            {
               // await rdfClient.UploadFileAsync("ds", filePath, graphName);
                Console.WriteLine("File successfully uploaded.");
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to upload file. Status Code: {(int)ex.StatusCode}");
                }
                else
                {
                    Console.WriteLine("Failed to upload file. Status Code: Unknown");
                }
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to upload file. Error: {ex.Message}");
            }
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

        private static string ReadMultilineInput()
        {
            StringBuilder input = new StringBuilder();
            string line;
            while ((line = Console.ReadLine() ?? "END") != "END")
            {
                input.AppendLine(line);
            }
            return input.ToString().Trim();
        }

        private static async Task PerformDataStoreOperations(RDFoxClient rdfClient, string dataStore)
        {
            try
            {
                // Fetch and display triples from the data store
                string responseData = await rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                var triples = rdfClient.ParseTriplesFromResponse(responseData);

                if (triples.Any())
                {
                    Console.WriteLine("Current triples in the data store:");
                    foreach (var triple in triples)
                    {
                        Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                    }
                }
                else
                {
                    Console.WriteLine("No triples found in the data store.");
                    return;
                }

                // Request user input for a specific triple to explain
                Console.WriteLine("\nEnter a triple to explain (format: Subject Predicate Object):");
                string tripleToExplain = Console.ReadLine() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(tripleToExplain) || !tripleToExplain.Contains(' '))
                {
                    Console.WriteLine("Invalid triple format. Operation aborted.");
                    return;
                }

                // Split the user input into subject, predicate, and object
                var parts = tripleToExplain.Split(new[] { ' ' }, 3);
                if (parts.Length != 3)
                {
                    Console.WriteLine("Invalid triple format. Operation aborted.");
                    return;
                }

                string subject = parts[0];
                string predicate = parts[1];
                string @object = parts[2];

                // Explain the selected triple
                string explanation = await rdfClient.ExplainTripleAsync(dataStore, subject, predicate, @object);
                Console.WriteLine("\nExplanation:");
                Console.WriteLine(explanation);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error performing data store operations: {ex.Message}");
            }
        }

        private static void PrintTriples(IEnumerable<Triple> triples)
        {
            foreach (var triple in triples)
            {
                Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
            }
        }

        private static List<Triple> ParseTriplesFromResponse(string response)
        {
            var triples = new List<Triple>();
            var lines = response.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (var line in lines)
            {
                var parts = line.Split('\t');
                if (parts.Length == 3)
                {
                    triples.Add(new Triple(parts[0], parts[1], parts[2]));
                }
            }

            return triples;
        }

        private static async Task CompareTriplesBeforeAndAfterUploadAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the data store name:");
            string dataStore = Console.ReadLine() ?? "ds";
            if (string.IsNullOrWhiteSpace(dataStore))
            {
                Console.WriteLine("Data store name is required. Operation aborted.");
                return;
            }

            Console.WriteLine("Enter the file path to upload:");
            string filePath = Console.ReadLine() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(filePath))
            {
                Console.WriteLine("File path is required. Operation aborted.");
                return;
            }

            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = Console.ReadLine() ?? string.Empty;

            try
            {
                // Fetch current triples before uploading the file
                Console.WriteLine("Fetching current triples...");
                var currentResponse = await rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response before upload: {currentResponse}");
                var currentTriples = ParseTriplesFromResponse(currentResponse);
                Console.WriteLine($"Parsed {currentTriples.Count} triples before upload.");
                PrintTriples(currentTriples);

                // Upload the file
                Console.WriteLine("Uploading file...");
              //  await rdfClient.UploadFileAsync(dataStore, filePath, graphName);
                Console.WriteLine("File successfully uploaded.");

                // Fetch updated triples after uploading the file
                Console.WriteLine("Fetching updated triples...");
                var updatedResponse = await rdfClient.ExecuteQueryAsync(dataStore, "SELECT ?s ?p ?o WHERE {?s ?p ?o}");
                Console.WriteLine($"Raw response after upload: {updatedResponse}");
                var updatedTriples = ParseTriplesFromResponse(updatedResponse);
                Console.WriteLine($"Parsed {updatedTriples.Count} triples after upload.");
                PrintTriples(updatedTriples);

                // Determine the new triples by counting the difference
                int newTriplesCount = updatedTriples.Count - currentTriples.Count;
                if (newTriplesCount > 0)
                {
                    var newTriples = updatedTriples.Skip(updatedTriples.Count - newTriplesCount).ToList();
                    Console.WriteLine($"Number of new triples added: {newTriplesCount}");
                    Console.WriteLine("New triples added:");
                    foreach (var triple in newTriples)
                    {
                        Console.WriteLine($"{triple.Subject} {triple.Predicate} {triple.Object}");
                    }
                }
                else
                {
                    Console.WriteLine("No new triples were added following the upload.");
                }
            }
            catch (HttpRequestException ex)
            {
                if (ex.StatusCode.HasValue)
                {
                    Console.WriteLine($"Failed to upload file and compare triples. Status Code: {(int)ex.StatusCode}");
                }
                else
                {
                    Console.WriteLine("Failed to upload file and compare triples. Status Code: Unknown");
                }
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to upload file and compare triples. Error: {ex.Message}");
            }
        }

        private static async Task LoadSwrlRulesAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the file path to the SWRL rules file:");
            string filePath = Console.ReadLine() ?? string.Empty;
            Console.WriteLine("Enter the datastore name:");
            string datastore = Console.ReadLine() ?? string.Empty;
            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = Console.ReadLine() ?? string.Empty;

            if (string.IsNullOrEmpty(filePath) || string.IsNullOrEmpty(datastore))
            {
                Console.WriteLine("File path and datastore name are required. Operation aborted.");
                return;
            }

            try
            {
                await rdfClient.UploadSWRLFileAsync(datastore, filePath, graphName);
                Console.WriteLine("SWRL rules successfully uploaded.");
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Failed to upload SWRL rules. Status Code: {ex.StatusCode}");
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to upload SWRL rules. Error: {ex.Message}");
            }
        }

        private static async Task LoadOwlFileAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the file path to the OWL file:");
            string filePath = Console.ReadLine() ?? string.Empty;
            Console.WriteLine("Enter the datastore name:");
            string datastore = Console.ReadLine() ?? string.Empty;
            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = Console.ReadLine() ?? string.Empty;

            if (string.IsNullOrEmpty(filePath) || string.IsNullOrEmpty(datastore))
            {
                Console.WriteLine("File path and datastore name are required. Operation aborted.");
                return;
            }

            try
            {
                await rdfClient.UploadOWLFileAsync(datastore, filePath, graphName);
                Console.WriteLine("OWL file successfully uploaded.");
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Failed to upload OWL file. Status Code: {ex.StatusCode}");
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to upload OWL file. Error: {ex.Message}");
            }
        }

        private static async Task LoadTtlFileAsync(RDFoxClient rdfClient)
        {
            Console.WriteLine("Enter the file path to the TTL file:");
            string filePath = Console.ReadLine() ?? string.Empty;
            Console.WriteLine("Enter the datastore name:");
            string datastore = Console.ReadLine() ?? string.Empty;
            Console.WriteLine("Enter the graph name (or leave empty for default graph):");
            string graphName = Console.ReadLine() ?? string.Empty;

            if (string.IsNullOrEmpty(filePath) || string.IsNullOrEmpty(datastore))
            {
                Console.WriteLine("File path and datastore name are required. Operation aborted.");
                return;
            }

            try
            {
               // await rdfClient.UploadTTLFileAsync(datastore, filePath, graphName);
                return;
               // Console.WriteLine("TTL file successfully uploaded.");
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"Failed to upload TTL file. Status Code: {ex.StatusCode}");
                Console.WriteLine($"Error: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to upload TTL file. Error: {ex.Message}");
            }
        }

    }
}
