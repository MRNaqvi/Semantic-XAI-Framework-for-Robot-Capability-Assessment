using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RdfoxWebApi;
using Python.Runtime;  // Required for Python.NET

var builder = WebApplication.CreateBuilder(args);

/*string pythonHome = @"C:\Users\zahoo\AppData\Local\Programs\Python\Python38";  // Update this path to your Python installation
Environment.SetEnvironmentVariable("PYTHONNET_PYDLL", pythonHome + @"\python38.dll"); // or the appropriate DLL for your Python version
PythonEngine.PythonHome = pythonHome;
PythonEngine.Initialize();*/
// Add services to the container.
builder.Services.AddControllers();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllOrigins",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

var rdfOxUrl = Environment.GetEnvironmentVariable("RDFOX_URL") ?? "http://localhost:12110/";
var rdfOxRole = Environment.GetEnvironmentVariable("RDFOX_ROLE") ?? "guest";
var rdfOxPassword = Environment.GetEnvironmentVariable("RDFOX_PASSWORD") ?? "guest";

builder.Services.AddScoped<RDFoxClient>(provider => new RDFoxClient(rdfOxUrl, rdfOxRole, rdfOxPassword));
builder.Services.AddScoped<OpenAIClient>(provider => new OpenAIClient(Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? string.Empty));
//builder.Services.AddSingleton<ModelPredictor>(new ModelPredictor(@"C:\Users\zahoo\Downloads\RazaWork\model_robotic_arm_4_weights.h5"));
//builder.Services.AddSingleton<ModelPredictor>(new ModelPredictor(@"C:\Users\zahoo\Downloads\RazaWork\model_robotic_arm_4_weights.h5"));

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseCors("AllowAllOrigins");

app.UseAuthorization();

app.MapControllers();

app.Run();
