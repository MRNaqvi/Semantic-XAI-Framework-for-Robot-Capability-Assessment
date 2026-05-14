public class ResponseHandler : DelegatingHandler
{
    public ResponseHandler(HttpMessageHandler innerHandler) : base(innerHandler) { }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            var ex = new HttpRequestException($"Request failed with status code {response.StatusCode}");
            ex.Data["ResponseBody"] = content;
            throw ex;
        }

        return response;
    }
}
