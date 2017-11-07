using System;
using System.Collections.Generic;
using System.Linq;
using OfficeOpenXml;
using System.IO;
using System.Data;
using System.Text.RegularExpressions;
using Microsoft.SharePoint.Client;
using Microsoft.SharePoint.Client.Taxonomy;
using System.Security;

namespace <%= namespace %>.Jobs
{
    public enum LogCategory
    {
        MissingTerm,
        UserNotFound,
        RowCount,
        Exceptions,
        DoneMessage
    }
    /// <summary>
    /// Helps in importing navigation items.
    /// </summary>
    public class SubmissionImporter : JobBase
    {
        private static readonly String NAVIGATIONFILELOCATION = "../../Resources/Templates/Files/Data";
        private static List<LogItem> _logs;
        private static Dictionary<string, TermCollection> termsetDictionary = new Dictionary<string, TermCollection>();
        
        public SubmissionImporter(string siteUrl, string domain, string userName, SecureString pwdS) : base(siteUrl, domain, userName, pwdS) {

        }
        /// <summary>
        /// Import data.
        /// </summary>
        public void Start()
        {
            using (var ctx = base.GetClientContext())
            {
                foreach (var f in Directory.GetFiles(NAVIGATIONFILELOCATION))
                    ImportSubmissionItemsFromSpreadSheet(new FileInfo(f), ctx);
            }
        }

        /// <summary>
        /// Iterated through spreadsheet and imports items to Global navigation list.
        /// </summary>
        /// <returns></returns>
        private static ImportResult ImportSubmissionItemsFromSpreadSheet(FileInfo file, ClientContext ctx)
        {
            _logs = new List<LogItem>();            
            using (var package = new ExcelPackage(file))
            {
                if (!file.Name.EndsWith(".xlsx")) return ImportResult.IncorrectFileFormat;

                var ws = package.Workbook.Worksheets[1];
                if (ws == null) return ImportResult.IncorrectFileFormat;

                if (!IsSpreadsheetValid(ws)) return ImportResult.IncorrectFileFormat;

                var dt = GetDataTableFromSpreadsheet(file);
                if (dt == null || dt.Rows.Count == 0) return ImportResult.None;
                Log($"Start Time: {DateTime.Now}");
                _logs.Add(new LogItem(LogCategory.RowCount, dt.Rows.Count));

                TaxonomySession taxonomySession = TaxonomySession.GetTaxonomySession(ctx);
                ctx.Load(taxonomySession, ts => ts.TermStores);
                ctx.ExecuteQuery();
                var termStore = taxonomySession.GetDefaultSiteCollectionTermStore();
                /*ctx.Load(termStore,
                             store => store.Groups.Include(group => group.TermSets));
                ctx.ExecuteQuery();

                ctx.Load(termStore.Groups);
                ctx.ExecuteQuery();*/

                TermGroup termGroup = termStore.GetSiteCollectionGroup(ctx.Site, false);
                ctx.Load(termGroup);
                ctx.Load(termGroup.TermSets);
                ctx.ExecuteQuery();
                foreach (var termSet in termGroup.TermSets)
                {
                    var allTerms = termSet.GetAllTerms();
                    ctx.Load(allTerms);
                    ctx.ExecuteQuery();
                    termsetDictionary.Add(termSet.Name, allTerms);
                }
                var lists = WorksheetToListMap.GroupBy(x => x.ListName);
                foreach(var list in lists)
                {
                    var listName = list.Key;
                    if (string.IsNullOrEmpty(listName)) continue;
                        
                    var columnNames = WorksheetToListMap.Where(x => x.ListName == listName).Select(x => x.ListColumnName);
                    for (int i = 0; i < dt.Rows.Count; i++)
                    {
                        if (i <= 1) continue;

                        var row = dt.Rows[i];
                        try
                        {
                            ImportRow(ctx, termGroup, listName, row, columnNames.ToArray(), i, ref _logs);
                        }
                        catch(Exception ex)
                        {
                            //if (Debugger.IsAttached) Debugger.Break();
                            _logs.Add(new LogItem(LogCategory.Exceptions, ex.Message));
                        }
                    }                        
                }
                
            }
            _logs.Add(new LogItem(LogCategory.DoneMessage, "Done"));
            WriteToLog(_logs);
            Log($"End Time: {DateTime.Now}");
            return ImportResult.None;
        }
        private static void WriteToLog(List<LogItem> logs)
        {
            var sortedLog = logs.OrderBy(x => x.Category);
            foreach(LogItem item in sortedLog)
            {
                if (item.Category == LogCategory.RowCount)
                    Log($"Total Row Count: {item.LogValue.ToString()}");
                else if (item.Category == LogCategory.MissingTerm)
                    Log($"Missing Term: {item.LogValue.ToString()}-Row Index: {item.RowIndex}-Column Name: {item.ColumnName}");
                else if (item.Category == LogCategory.UserNotFound)
                    Log($"User not found {item.LogValue.ToString()}-Row Index: {item.RowIndex}-Column Name: {item.ColumnName}");
                else if (item.Category == LogCategory.Exceptions)
                    Log($"Exceptions: {item.LogValue}");
                else if (item.Category == LogCategory.DoneMessage)
                    Log($"{item.LogValue}");
            }
        }
        private static void ImportRow(ClientContext ctx, TermGroup termGroup, string listName, DataRow row, string[] columnNames, int rowIndex, ref List<LogItem> logs)
        {
            var web = ctx.Web;
            ctx.Load(web);
            ctx.ExecuteQuery();
            
            ctx.Load(web.Lists);
            ctx.ExecuteQuery();
            var list = web.Lists.FirstOrDefault(r => Regex.IsMatch(r.Title, listName, RegexOptions.IgnoreCase | RegexOptions.Compiled));
            ctx.Load(list);

            var fields = list.Fields;
            ctx.Load(fields);
            ctx.ExecuteQuery();

            var data = new List<DataFieldItem>();

            foreach (var name in columnNames)
            {                
                if (WorksheetToListMap.FirstOrDefault(x => x.ListName == listName && x.ListColumnName == name).Ignore) continue;

                var field = fields.FirstOrDefault(x => x.InternalName == name);
                var mappedProperty = WorksheetToListMap.FirstOrDefault(x => x.ListName == listName && x.ListColumnName == name);
                var value = row[mappedProperty.ColumnCode].ToString().Trim();
                if (string.IsNullOrEmpty(value)) continue;

                switch (field.TypeAsString)
                {
                    case "TaxonomyFieldTypeMulti":
                        {
                            // log if term isnt found
                            var excelTerms = value.Split(new char[] { ',', ';' });
                            var f = field as TaxonomyField;
                            var terms = new List<string>();

                            for (int i = 0; i < excelTerms.Length; i++)
                            {
                                if (string.IsNullOrEmpty(excelTerms[i])) continue;
                                Term term = null;
                                try
                                {
                                    term = GetTermByLabel(termGroup, excelTerms[i], mappedProperty.TermSetName);
                                }
                                catch
                                {
                                    if (!logs.Exists(x => x.Category == LogCategory.MissingTerm && x.LogValue.ToString() == excelTerms[i].ToString()))
                                        logs.Add(new LogItem(LogCategory.MissingTerm, value, name, rowIndex));
                                }
                                /*
                                if (term == null)
                                {
                                    if (!logs.Exists(x => x.Category == LogCategory.MissingTerm && x.LogValue.ToString() == value.ToString()))
                                        logs.Add(new LogItem(LogCategory.MissingTerm, value, name, rowIndex));
                                    continue;
                                }
                                */
                                if (term != null)
                                {
                                    terms.Add($"-1;#{excelTerms[i]}|{term.Id}");
                                }
                            }
                            var termString = string.Join(";#", terms.ToArray());
                            if (!string.IsNullOrEmpty(termString))
                            {
                                var o = new DataFieldItem {
                                    Name = name,
                                    SPField = field,
                                    FieldValue = termString
                                };
                                data.Add(o);
                            }
                        }
                        break;
                    case "TaxonomyFieldType":
                        {
                            // log if term isnt found
                            var f = field as TaxonomyField;
                            //var term = GetTermByLabel(ctx, value, mappedProperty.TermGroup, mappedProperty.TermSetName);
                            var term = GetTermByLabel(termGroup, value, mappedProperty.TermSetName);

                            if (term == null)
                            {
                                if (!logs.Exists(x => x.Category == LogCategory.MissingTerm && x.LogValue.ToString() == value.ToString()))
                                    logs.Add(new LogItem(LogCategory.MissingTerm, value, name, rowIndex));
                                break;
                            }                                
                            TaxonomyFieldValue taxValue = new TaxonomyFieldValue();
                            taxValue.TermGuid = term.Id.ToString();
                            taxValue.Label = term.Name;
                            taxValue.WssId = -1;

                            data.Add(new DataFieldItem
                            {
                                Name = name,
                                SPField = field,
                                FieldValue = term
                            });
                        }
                        break;
                    case "User":
                        var user = ctx.Web.SiteUsers.GetByEmail(value);
                        ctx.Load(user);
                        try { ctx.ExecuteQuery(); }
                        catch
                        {
                            if (!logs.Exists(x => x.Category == LogCategory.UserNotFound && x.LogValue.ToString() == value.ToString()))
                                logs.Add(new LogItem(LogCategory.UserNotFound, value, name, rowIndex));
                            continue;
                        }

                        var userValue = new FieldUserValue();
                        userValue.LookupId = user.Id;
                        data.Add(new DataFieldItem
                        {
                            Name = name,
                            SPField = field,
                            FieldValue = userValue
                        });
                        break;
                    case "DateTime":
                        DateTime d;
                        if (DateTime.TryParse(value, out d))
                            data.Add(new DataFieldItem
                            {
                                Name = name,
                                SPField = field,
                                FieldValue = d.ToShortDateString()
                            });
                        else continue;
                        break;
                    case "Boolean":
                        data.Add(new DataFieldItem
                        {
                            Name = name,
                            SPField = field,
                            FieldValue = (value == "Yes" ? true : false)
                        });
                        break;
                    default:
                        data.Add(new DataFieldItem
                        {
                            Name = name,
                            SPField = field,
                            FieldValue = value
                        });
                        break;
                }           
            }

            var itemCreateInfo = new ListItemCreationInformation();
            var newItem = list.AddItem(itemCreateInfo);

            foreach (var d in data)
            {
                var field = d.SPField;
                switch (field.TypeAsString)
                {
                    case "TaxonomyFieldTypeMulti":
                        {
                            var f = field as TaxonomyField;
                            f.SetFieldValueByValueCollection(newItem, new TaxonomyFieldValueCollection(ctx, d.FieldValue.ToString(), f));
                        }
                        break;
                    case "TaxonomyFieldType":
                        {
                            var f = field as TaxonomyField;
                            f.SetFieldValueByValue(newItem, d.FieldValue as TaxonomyFieldValue);
                        }
                        break;
                    case "User":
                        newItem[field.InternalName] = d.FieldValue;
                       break;
                    case "DateTime":
                        newItem[field.InternalName] = d.FieldValue;
                        break;
                    case "Boolean":
                        newItem[field.InternalName] = d.FieldValue;
                        break;
                    default:
                        newItem[field.InternalName] = d.FieldValue;
                        break;
                }
            }
            newItem["CEN_ClinicalReviewPhase"] = "Complete";
            newItem["CEN_ProgressStatus"] = "Final";
            
            newItem.Update();

            try { ctx.ExecuteQuery(); }
            catch(Exception ex)
            {
                //if (Debugger.IsAttached) Debugger.Break();
                logs.Add(new LogItem(LogCategory.Exceptions, newItem.Id, newItem["Title"].ToString(), rowIndex));
            }
            
        }
        public static void Log(string msg)
        {
            System.IO.StreamWriter sw = System.IO.File.AppendText(@"C:\Logs\log-data-issues.txt");
            try
            {
                string logLine = System.String.Format(
                    "{0:G}: {1}.", System.DateTime.Now, msg);
                sw.WriteLine(logLine);
            }
            finally
            {
                sw.Close();
            }
        }
        /// <summary>
        /// Validate columns and match with the list columns.
        /// </summary>
        /// <param name="ws"></param>
        /// <returns></returns>
        private static bool IsSpreadsheetValid(ExcelWorksheet ws)
        {
            try
            {

                var columnsList = new List<String> { "1-1", "1-2", "1-3", "1-4", "1-5", "1-8", "1-9", "1-10", "1-16", "1-17", "1-14", "1-18", "1-19", "1-6", "2-2", "2-3", "2-4", "1-20", "2-6", "1-11", "1-12", "1-13", "3-1", "3-2", "4-2", "4-3", "4-7", "4-8", "4-9", "5-13", "5-14", "5-15", "5-16", "5-19", "5-20", "5-25", "5-26" };
                if (ws == null) return false;
                using (var headers = ws.Cells[1, 2, 1, ws.Dimension.End.Column])
                {
                    if (!columnsList.All(r => headers.Any(h => h.Value.Equals(r))))
                        return false;
                }
            }
            catch
            {
                throw;
            }
            return true;
        }
        /// <summary>
        /// Returns a datatable from spreadsheet.
        /// </summary>
        /// <param name="file"></param>
        /// <returns></returns>
        private static DataTable GetDataTableFromSpreadsheet(FileInfo file)
        {
            try
            {
                using (var package = new ExcelPackage())
                using (var stream = file.OpenRead())
                {
                    package.Load(stream);
                    return package.ToDataTable();
                }
            }
            catch(Exception ex)
            {
                //if (Debugger.IsAttached) Console.WriteLine(ex.Message);
                throw;
            }
        }
       
        public static Microsoft.SharePoint.Client.Taxonomy.Term GetTermByLabel(TermGroup termGroup, String label, string termSetName)
        {
            label = label.Trim();
            switch (label) {
                case "Medicaid":
                case "Marketplace":
                case "Medicare":
                    label = "Organization " + label;
                    break;
                case "Health Outcome":
                case "Health Outcomes":
                    label = "Improve Health Outcomes";
                    break;
                case "Envolve People Care":
                case "Envolve PeopleCare":
                    label = "Envolve People Care (EPC)";
                    break;
                    
            }

            foreach (var item in termsetDictionary)
            {
                if (item.Key == termSetName) {
                    var term = item.Value.FirstOrDefault(r => Regex.IsMatch(r.Name, label, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled));
                    term.TermSet.Name = termSetName;
                    return term;
                }
            }
            /*foreach (var termSet in termGroup.TermSets)
            {
                if (termSet.Name == termSetName) {
                    var term = termSet.Terms.FirstOrDefault(r => Regex.IsMatch(r.Name, label, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled));
                    term.TermSet.Name = termSetName;
                    return term;
                }
            }*/
            return null;
        }
        public static List<DataItem> WorksheetToListMap
        {
            get
            {
                return new List<DataItem> {
                    new DataItem { ColumnCode = "1-1", ListName = "Program Submissions", ListColumnName = "Created", Ignore = true },
                    new DataItem { ColumnCode = "1-3", ListName = "Program Submissions", ListColumnName = "CEN_SubmittedBy" },
                    new DataItem { ColumnCode = "1-4", ListName = "Program Submissions", ListColumnName = "CEN_ProjectLeader" },
                    new DataItem { ColumnCode = "1-5", ListName = "Program Submissions", ListColumnName = "CEN_BusinessSponsor", Ignore = true },
                    new DataItem { ColumnCode = "1-6", ListName = "Program Submissions", ListColumnName = "CEN_IsExternalPartner" },
                    new DataItem { ColumnCode = "1-8", ListName = "Program Submissions", ListColumnName = "CEN_Contributors" },
                    new DataItem { ColumnCode = "1-9", ListName = "Program Submissions", ListColumnName = "CEN_IsPilot" },
                    new DataItem { ColumnCode = "1-10", ListName = "Program Submissions", ListColumnName = "Title" },
                    new DataItem { ColumnCode = "1-11", ListName = "Program Submissions", ListColumnName = "CEN_ProgramStatus" },
                    new DataItem { ColumnCode = "1-12", ListName = "Program Submissions", ListColumnName = "CEN_ProgramStartDate" },
                    new DataItem { ColumnCode = "1-13", ListName = "Program Submissions", ListColumnName = "CEN_ProgramEndDate" },
                    new DataItem { ColumnCode = "1-16", ListName = "Program Submissions", ListColumnName = "CEN_ProgramDescription" },
                    new DataItem { ColumnCode = "1-17", ListName = "Program Submissions", ListColumnName = "CEN_ProgramKeywords", TermGroup="Program Tracking", TermSetName="Program Keywords", Ignore = true },
                    new DataItem { ColumnCode = "1-14", ListName = "Program Submissions", ListColumnName = "CEN_ProgramRationale", TermGroup="Program Tracking", TermSetName="Program Rationale" },
                    new DataItem { ColumnCode = "1-18", ListName = "Program Submissions", ListColumnName = "CEN_ProgramWorkLocation" },
                    new DataItem { ColumnCode = "1-19", ListName = "Program Submissions", ListColumnName = "CEN_IsProgramOffered" },
                    new DataItem { ColumnCode = "1-20", ListName = "Program Submissions", ListColumnName = "CEN_ParticipatingOrg", TermGroup="Program Tracking", TermSetName="Program External Organizations" },
                    new DataItem { ColumnCode = "1-19", ListName = "Program Submissions", ListColumnName = "CEN_IsProgramOffered" },

                    new DataItem { ColumnCode = "2-2", ListName = "Program Submissions", ListColumnName = "CEN_HasExternalVendor" },
                    new DataItem { ColumnCode = "2-3", ListName = "Program Submissions", ListColumnName = "CEN_VendorProductName" },
                    /* commented out because this is a document upload field and all values say n/a
                    new DataItem { ColumnCode = "2-4", ListName = "ProgramSubmission", ListColumnName = "" },
                    */
                    new DataItem { ColumnCode = "2-6", ListName = "Program Submissions", ListColumnName = "CEN_HasMarketingMaterial" },
                    /*
                    //Key words: (program/pilot)
                    new DataItem { ColumnCode = "3-1", ListName = "", ListColumnName = "", Ignore = true },
                    //Key words: target population  
                    new DataItem { ColumnCode = "3-2", ListName = "", ListColumnName = "", Ignore = true },

                    new DataItem { ColumnCode = "4-2", ListName = "Vendor Eval WF Tasks", ListColumnName = "CEN_HEROInterviewComplete", Ignore = true },
                    //HERO Team Abstract/Program Description 
                    new DataItem { ColumnCode = "4-3", ListName = "", ListColumnName = "", Ignore = true },
                    new DataItem { ColumnCode = "4-7", ListName = "Vendor Eval WF Tasks", ListColumnName = "CEN_HEROInterventionType", Ignore = true },
                    //Recommended Study Design
                    new DataItem { ColumnCode = "4-8", ListName = "", ListColumnName = "", Ignore = true },
                    //Recommended outcome measures
                    new DataItem { ColumnCode = "4-9", ListName = "", ListColumnName = "", Ignore = true },

                    new DataItem { ColumnCode = "5-13", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FNumberOfEligibleMembers" },
                    new DataItem { ColumnCode = "5-14", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FNumberOfParticipants" },
                    new DataItem { ColumnCode = "5-15", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FResultsMeaningfulOrClinicall" },
                    new DataItem { ColumnCode = "5-16", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FResultsStatisticallySignific" },
                    new DataItem { ColumnCode = "5-19", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FProgramTotalCost" },
                    new DataItem { ColumnCode = "5-20", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FProgramProducedPostive" },
                    new DataItem { ColumnCode = "5-25", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FAwardReceived" },
                    new DataItem { ColumnCode = "5-26", ListName = "Program Outcome Evaluation", ListColumnName = "CEN%5FAwardType" }
                    */
                };
            }
        }
    }
    /// <summary>
    /// Converts spreadsheet to DataTable.
    /// </summary>
    public static class ExcelPackageExtensions
    {
        /// <summary>
        /// Return the index of the specific column
        /// </summary>
        /// <param name="sheet"></param>
        /// <param name="columnName"></param>
        /// <returns></returns>
        public static int GetHeaderColumnIndex(this ExcelWorksheet sheet, String columnName)
        {
            int columnIndex = 0;
            foreach (var secondRowCell in sheet.Cells[sheet.Dimension.Start.Row + 1, sheet.Dimension.Start.Column, 2, sheet.Dimension.End.Column])
            {
                columnIndex += 1;
                if (Regex.IsMatch(secondRowCell.Value.ToString(), columnName, RegexOptions.IgnoreCase))
                    return columnIndex;
            }
            return 0;
        }
        /// <summary>
        /// Returns the datatable from excel package.
        /// </summary>
        /// <param name="package"></param>
        /// <param name="hasInternalHeaders"></param>
        /// <returns></returns>
        public static DataTable ToDataTable(this ExcelPackage package, bool hasInternalHeaders = false)
        {
            var table = new DataTable();

            try
            {
                var ws = package.Workbook.Worksheets.First();
                var firstCell = ws.GetValue(1, 1);
                if (firstCell == null) ws.SetValue("A1", "ID");

                foreach (var secondRowCell in ws.Cells[ws.Dimension.Start.Row, ws.Dimension.Start.Column, 1, ws.Dimension.End.Column])
                {
                    var columnName = secondRowCell.Text;
                    table.Columns.Add(secondRowCell.Text);
                }
                    
                for (var rowNumber = 2; rowNumber <= ws.Dimension.End.Row; rowNumber++)
                {
                    if (ws.GetValue(rowNumber, 1) == null) continue;
                    var row = ws.Cells[rowNumber, 1, rowNumber, ws.Dimension.End.Column];
                    var newRow = table.NewRow();
                    
                    foreach (var cell in row)
                    {
                        var cellIndex = cell.Start.Column - 1;
                        if ((newRow.ItemArray.Count() - 1) < cellIndex)
                            continue;                                               
                        newRow[cellIndex] = cell.Text;
                    }
                    table.Rows.Add(newRow);
                }
            }
            catch (Exception)
            {
                throw;
            }
            return table;
        }
        
    }
    /// <summary>
    /// Results for import.
    /// </summary>
    public enum ImportResult
    {
        None,
        Success,
        Failed,
        IncorrectFileFormat
    }
    /// <summary>
    /// Navigation item level.
    /// </summary>
    public enum Level
    {
        Level1,
        Level2,
        Level3
    } 
    public class DataItem
    {
        public string ColumnCode { get; set; }
        public string ListName { get; set; }
        public string ListColumnName { get; set; }
        public bool Ignore { get; set; } = false;
        public string TermGroup { get; set; }
        public string TermSetName { get; set; }
    }
    public class DataFieldItem
    {
        public string Name { get; set; }
        public Field SPField { get; set; }
        public object FieldValue { get; set; }
    }
    public class LogItem
    {
        public LogItem() { }
        public LogItem(LogCategory logCategory, object logValue)
        {
            Category = logCategory;
            LogValue = logValue;
        }
        public LogItem(LogCategory logCategory, object logValue, string columnName, int rowIndex)
        {
            Category = logCategory;
            LogValue = logValue;
            ColumnName = columnName;
            RowIndex = rowIndex;
        }
        public LogCategory Category { get; set; }
        public object LogValue { get; set; }
        public string ColumnName { get; set; }
        public int RowIndex { get; set; }
    }
}
