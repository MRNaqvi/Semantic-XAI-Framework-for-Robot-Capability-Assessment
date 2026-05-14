/*using AngleSharp.Io;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using System;
using System.Threading.Tasks;

namespace RdfoxWebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OperationController : ControllerBase
    {
        private readonly RDFoxClient _rdfClient;

        public OperationController(RDFoxClient rdfClient)
        {
            _rdfClient = rdfClient;
        }

        [HttpGet("{p_veh_reg_no}")]
        public async Task<IActionResult> ListRolesAsync(string p_veh_reg_no)
        {
            Console.WriteLine("Sending request to list roles...");

            try
            {
                var roles = await _rdfClient.ListRolesAsync();
                Console.WriteLine("Roles:");
                Console.WriteLine(roles);

                // Simulating role data for demonstration purposes
                var roleData = new[]
                {
                    new { RoleId = 1, RoleName = "Admin" },
                    new { RoleId = 2, RoleName = "User" }
                };

                var response = ApiResponse<object>.Success($"{roleData.Length} Record(s) Loaded Successfully", roleData);

                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to list roles. Error: {ex.Message}");
                var errorResponse = ApiResponse<object>.Error($"Failed to list roles. Error: {ex.Message}", p_veh_reg_no);

                return StatusCode(StatusCodes.Status500InternalServerError, errorResponse);
            }
        }

        public async Task<IActionResult> QueryDataAsync()
        {
            Console.WriteLine("Enter the SPARQL query (type 'END' on a new line to finish):");
            //string query = ReadMultilineInput();
            string query = "SELECT ?s ?p ?o WHERE {?s ?p ?o}";
            if (string.IsNullOrEmpty(query))
            {
                Console.WriteLine("No query entered. Operation aborted.");
                var response1 = ApiResponse<object>.Error("Failure", query);
                return Ok(response1);
            }

            try
            {
                var response = await _rdfClient.ExecuteQueryAsync("ds", query);
                var response1 = ApiResponse<object>.Success($"{response.Length} Record(s) Loaded Successfully", response);

                return Ok(response);
              
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to query data. Error: {ex.Message}");
                var errorResponse = ApiResponse<object>.Error($"Failed to list roles. Error: {ex.Message}", query);
                return StatusCode(StatusCodes.Status500InternalServerError, errorResponse);
            }
        }
    }
}
*/