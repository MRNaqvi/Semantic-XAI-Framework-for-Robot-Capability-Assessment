using System.Net;

public class ApiResponse
{/*
    public int Code { get; set; }
    public bool Status { get; set; }
    public string Message { get; set; }
    public T Data { get; set; }

    public static ApiResponse<T> Success(string message, T data)
    {
        return new ApiResponse<T>
        {
            Code = 200,
            Status = true,
            Message = message,
            Data = data
        };
    }
    public static ApiResponse<T> Error(string message, T data)
    {
        return new ApiResponse<T>
        {
            Code = 500,
            Status = false,
            Message = message,
            Data = default
        };
    }*/

    public static object CreatResponse(string _result, object _object, string _action, int Count = 0, bool multipleMsg = false, bool Pagination = false, int rowsPerPage = 0, int pageNo = 0, int RowCount = 0)
    {
        string _msg = "";
        if (_action == "List")
        {
            if (Pagination == true)
            {

                double number = (double)Count / rowsPerPage;
                double Page_count = Math.Ceiling(number);
                var model = new
                {
                    code = HttpStatusCode.OK,
                    status = true,
                    total_count = Count,
                    total_pages = (int)Page_count,
                    offset = ((pageNo - 1) * rowsPerPage),
                    rows_per_page = rowsPerPage,
                    pageno = pageNo,

                    message = RowCount + " Record(s) Lodded Successfully",

                    data = _object
                };

                return model;
            }
            else
            {
                var model = new
                {
                    code = HttpStatusCode.OK,
                    status = true,
                    message = Count + " Record(s) Lodded Successfully",

                    data = _object

                    //_object = new
                    //{
                    //    _data = _object,
                    //    code = HttpStatusCode.OK,
                    //    Message = Count + " Record(s) Lodded Successfully",
                    //},
                };

                return model;
            }

        }
        else if (_action == "Report")
        {
            if (Pagination == true)
            {

                double number = (double)Count / rowsPerPage;
                double Page_count = Math.Ceiling(number);
                var model = new
                {
                    code = HttpStatusCode.OK,
                    status = true,
                    message = RowCount + " Record(s) Lodded Successfully",

                    data = _object
                };

                return model;
            }
            else
            {
                var model = new
                {
                    code = HttpStatusCode.OK,
                    status = true,
                    message = Count + " Record(s) Lodded Successfully",

                    data = _object
                };

                return model;
            }

        }
        else if (_action == "By_id")
        {
            var model = new
            {
                _object = new
                {
                    _data = _object,
                    code = HttpStatusCode.OK,
                    Message = Count + " Record(s) Lodded Successfully",
                },
            };


            return model;
        }
        else if (_action == "Delete")
        {
            if (_result == "Success" || multipleMsg)
            {
                _msg = "Record Deleted Successfully";
                var model = new
                {

                    code = HttpStatusCode.Accepted,
                    status = true,
                    message = _msg,
                    data = ""

                   
                  
                };
                return model;

            }
            else
            {
                _msg = _result;
                var model = new
                {
                    code = HttpStatusCode.BadRequest,
                    status = false,
                    message = "Failed to Effect the Data",
                    data = ""
                };
                return model;
            }
        }
        else
        {
            if (_result == "Success" || multipleMsg)
            {

                if (_action == "Add")
                {
                    if (multipleMsg)
                    {
                        _msg = _result;
                    }
                    else
                    {
                        _msg = "Record Saved Successfully";
                    }
                }
                else
                {
                    if (multipleMsg)
                    {
                        _msg = _result;
                    }
                    else
                    {
                        _msg = "Recored Updated Successfully";
                    }
                }
                if (_msg.Contains("failed") == true)
                {
                    var model = new
                    {
                        code = HttpStatusCode.ExpectationFailed,
                        status = false,
                        message = _msg,
                        data = ""
                    };
                    return model;
                }
                else
                {
                    var model = new
                    {
                        code = HttpStatusCode.Accepted,
                        status = true,
                        message = _msg,
                        data = _object


                    };
                    return model;
                }

            }
            else
            {
                var model = new
                {
                    code = HttpStatusCode.BadRequest,
                    status = false,
                    message = "Failed to Effect the Data",
                    data = ""
                };
                return model;
            }
        }

    }

}
