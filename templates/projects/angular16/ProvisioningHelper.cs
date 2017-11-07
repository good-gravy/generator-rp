using System;
using Microsoft.SharePoint.Client;
using OfficeDevPnP.Core.Framework.Provisioning.Connectors;
using OfficeDevPnP.Core.Framework.Provisioning.Model;
using OfficeDevPnP.Core.Framework.Provisioning.ObjectHandlers;
using OfficeDevPnP.Core.Framework.Provisioning.Providers.Xml;
using System.Security;
using System.Threading;
using System.IO;
using System.Configuration;

namespace <%= namespace %>.Deployment
{
    public class ProvisioningHelper
    {
        public static ProvisioningTemplate GenerateProvisioningTemplate(ConsoleColor defaultForeground, ClientContext ctx, string filePath, string fileName)
        {
            //using (var ctx = new ClientContext(webUrl))
            {
                // ctx.Credentials = new NetworkCredentials(userName, pwd);
                //ctx.Credentials = new SharePointOnlineCredentials(userName, pwd);
                ctx.RequestTimeout = Timeout.Infinite;

                // Just to output the site details
                Web web = ctx.Web;
                ctx.Load(web, w => w.Title);
                ctx.ExecuteQueryRetry();

                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("Your site title is:" + ctx.Web.Title);
                Console.ForegroundColor = defaultForeground;

                var ptci = new ProvisioningTemplateCreationInformation(ctx.Web);

                // Create FileSystemConnector to store a temporary copy of the template 
                ptci.FileConnector = new FileSystemConnector(filePath, "");
                ptci.PersistComposedLookFiles = true;
                ptci.ProgressDelegate = delegate (String message, Int32 progress, Int32 total)
                {
                    // Only to output progress for console UI
                    Console.WriteLine("{0:00}/{1:00} - {2}", progress, total, message);
                };
                //ptci.IncludeAllTermGroups = true;
                ptci.IncludeAllTermGroups = false;
                ptci.IncludeNativePublishingFiles = false;
                ptci.IncludeSearchConfiguration = false;
                ptci.IncludeSiteCollectionTermGroup = false;
                ptci.IncludeSiteGroups = false;
                ptci.IncludeTermGroupsSecurity = false;

                //ptci.HandlersToProcess = Handlers.All;

                //ALL
                ptci.HandlersToProcess = Handlers.AuditSettings | Handlers.ComposedLook | Handlers.ContentTypes | Handlers.CustomActions | Handlers.ExtensibilityProviders | Handlers.Features | Handlers.Fields | Handlers.Files | Handlers.Lists | Handlers.Navigation | Handlers.PageContents | Handlers.Pages | Handlers.PropertyBagEntries | Handlers.Publishing | Handlers.RegionalSettings | Handlers.SearchSettings;// | Handlers.WebSettings;

                //PART 1
                //ptci.HandlersToProcess = Handlers.ContentTypes | Handlers.Fields | Handlers.Files | Handlers.Lists;

                //PART 2    
                //ptci.HandlersToProcess = Handlers.Files | Handlers.Pages;

                //ptci.HandlersToProcess = Handlers.PageContents | Handlers.Pages | Handlers.PropertyBagEntries | Handlers.Publishing | Handlers.RegionalSettings | Handlers.SearchSettings | Handlers.WebSettings;

                // Execute actual extraction of the template
                ProvisioningTemplate template = ctx.Web.GetProvisioningTemplate(ptci);

                // We can serialize this template to save and reuse it
                // Optional step 
                var provider = new XMLFileSystemTemplateProvider(filePath, "");
                provider.SaveAs(template, fileName);

                return template;
            }
        }

        public static string GetDeploymentResourcesPath()
        {
            var fileInfo = new FileInfo(AppDomain.CurrentDomain.BaseDirectory);
            var basePath = fileInfo.Directory?.Parent?.Parent?.FullName;
            return basePath != null ? Path.Combine(basePath, "Resources") : null;
        }

        public static void ApplyCustomTemplateToSite(ConsoleColor defaultForeground, string webUrl, string domain, string userName, SecureString pwd, string templateName, string resourcesPath)
        {
            var template = GetProvisioningTemplateFromResourcePath(templateName, resourcesPath, "Templates");
            ApplyCustomTemplateToSite(defaultForeground, webUrl, domain, userName, pwd, templateName, resourcesPath);
        }

        public static void ApplyCustomTemplateToSite(ConsoleColor defaultForeground, ClientContext ctx, ProvisioningTemplate template)
        {
            try
            {
                {
                    //ctx.Credentials = new NetworkCredentials(userName, pwd);
                    //ctx.Credentials = new SharePointOnlineCredentials(userName, pwd);
                    //ctx.RequestTimeout = Timeout.Infinite;

                    // Just to output the site details
                    Web web = ctx.Web;
                    ctx.Load(web, w => w.Title);
                    ctx.ExecuteQueryRetry();

                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine("Your site title is:" + ctx.Web.Title);
                    Console.ForegroundColor = defaultForeground;

                    // Apply template to the site
                    var applyingInformation = new ProvisioningTemplateApplyingInformation();
                    
                    applyingInformation.HandlersToProcess = Handlers.All;
                    applyingInformation.ProgressDelegate = new ProvisioningProgressDelegate(progressDelegateHandler);
                    web.ApplyProvisioningTemplate(template, applyingInformation);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
        }

        public static void progressDelegateHandler(string message, int step, int total)
        {
            Console.WriteLine(string.Format("{0}/{1} {2}", step, total, message));
        }


        public static ProvisioningTemplate GetProvisioningTemplateFromResourcePath(string templateName, DirectoryInfo directory, string provisionResourceFolder = null)
        {
            if (provisionResourceFolder == null)
                return GetProvisioningTemplateFromResourcePath(templateName, directory.Parent.FullName, directory.Name);
            else
                return GetProvisioningTemplateFromResourcePath(templateName, directory.Parent.FullName, directory.Name, provisionResourceFolder);
        }

        public static ProvisioningTemplate GetProvisioningTemplateFromResourcePath(string templateName, string resourcesPath, string folderName)
        {
            // Template to be applied to site
            ProvisioningTemplate template = null;
            XMLFileSystemTemplateProvider provider = new XMLFileSystemTemplateProvider(resourcesPath, folderName);
            template = provider.GetTemplate(templateName);

            var ProvisioningResourceFolder = ConfigurationManager.AppSettings["ProvisioningResourceFolder"] != null ? ConfigurationManager.AppSettings["ProvisioningResourceFolder"].ToString() : "";
            if (string.IsNullOrEmpty(ProvisioningResourceFolder))
            {
                ProvisioningResourceFolder = resourcesPath;
            }
            Console.WriteLine(ProvisioningResourceFolder);
            template.Connector = new FileSystemConnector(ProvisioningResourceFolder, "");

            return template;
        }
        public static ProvisioningTemplate GetProvisioningTemplateFromResourcePath(string templateName, string resourcesPath, string folderName, string provisionResourceFolderPath)
        {
            // Template to be applied to site
            ProvisioningTemplate template = null;
            XMLFileSystemTemplateProvider provider = new XMLFileSystemTemplateProvider(resourcesPath, folderName);
            template = provider.GetTemplate(templateName);
            template.Connector = new FileSystemConnector(provisionResourceFolderPath, "");
            
            return template;
        }
        public static void ReportOnTemplateStats(ProvisioningTemplate template)
        {
            Console.WriteLine("");
            Console.WriteLine("STATS");
            Console.WriteLine("-----");

            ReportOnCollectionCount("", template.AddIns);
            //ReportOnCollectionCount("", template.AuditSettings);
            //ReportOnComposedLook("", template.ComposedLook);
            ReportOnWebSettings("", template.WebSettings);
            ReportOnCollectionCount("ContentTypes", template.ContentTypes);
            if (template.CustomActions != null)
            {
                ReportOnCollectionCount("SiteCustomActions", template.CustomActions.SiteCustomActions);
                ReportOnCollectionCount("WebCustomActions", template.CustomActions.WebCustomActions);
            }
            if (template.Features != null)
            {
                ReportOnCollectionCount("SiteFeatures", template.Features.SiteFeatures);
                ReportOnCollectionCount("WebFeatures", template.Features.WebFeatures);
            }
            ReportOnCollectionCount("Files", template.Files);
            ReportOnCollectionCount("Lists", template.Lists);
            ReportOnCollectionCount("Localizations", template.Localizations);
            ReportOnCollectionCount("Pages", template.Pages);
            ReportOnCollectionCount("Parameters", template.Parameters);
            ReportOnCollectionCount("Properties", template.Properties);
            ReportOnCollectionCount("PropertyBagEntries", template.PropertyBagEntries);
            if (template.Publishing != null)
            {
                ReportOnCollectionCount("AvailableWebTemplates", template.Publishing.AvailableWebTemplates);
                ReportOnCollectionCount("PageLayouts", template.Publishing.PageLayouts);
            }
            //ReportOnCollectionCount("", template.RegionalSettings);
            Console.WriteLine(string.Format("  {0} - {1}", "SearchSettings", template.SearchSettings));

            if (template.Security != null)
            {
                ReportOnCollectionCount("AdditionalAdministrators", template.Security.AdditionalAdministrators);
                ReportOnCollectionCount("AdditionalMembers", template.Security.AdditionalMembers);
                ReportOnCollectionCount("AdditionalOwners", template.Security.AdditionalOwners);
                ReportOnCollectionCount("AdditionalVisitors", template.Security.AdditionalVisitors);
                ReportOnCollectionCount("RoleAssignments", template.Security.SiteSecurityPermissions.RoleAssignments);
                ReportOnCollectionCount("RoleDefinitions", template.Security.SiteSecurityPermissions.RoleDefinitions);
            }

            ReportOnCollectionCount("SiteFields", template.SiteFields);
            Console.WriteLine(string.Format("  {0} - {1}", "SitePolicy", template.SitePolicy));
            ReportOnCollectionCount("SupportedUILanguages", template.SupportedUILanguages);
            ReportOnCollectionCount("TermGroups", template.TermGroups);
        }

        private static void ReportOnCollectionCount(string name, System.Collections.ICollection collection)
        {
            if (collection == null || collection.Count <= 0)
                return;

            Console.WriteLine(string.Format("{0} - {1}", name, collection.Count));

        }

        private static void ReportOnComposedLook(string name, ComposedLook composedLook)
        {
            Console.WriteLine(string.Format("Composed Look"));

            Console.WriteLine(string.Format("{0} - {1}", "AlternateCSS", composedLook.AlternateCSS));
            Console.WriteLine(string.Format("{0} - {1}", "BackgroundFile", composedLook.BackgroundFile));
            Console.WriteLine(string.Format("{0} - {1}", "MasterPage", composedLook.MasterPage));
            Console.WriteLine(string.Format("{0} - {1}", "MasterPage", composedLook.SiteLogo));

        }

        private static void ReportOnWebSettings(string name, WebSettings settings)
        {
            if (settings == null)
                return;

            Console.WriteLine(string.Format("Web Settings"));
            Console.WriteLine(string.Format("  {0} - {1}", "AlternateCSS", settings.AlternateCSS));
            Console.WriteLine(string.Format("  {0} - {1}", "CustomMasterPageUrl", settings.CustomMasterPageUrl));
            Console.WriteLine(string.Format("  {0} - {1}", "Description", settings.Description));
            Console.WriteLine(string.Format("  {0} - {1}", "MasterPageUrl", settings.MasterPageUrl));
            Console.WriteLine(string.Format("  {0} - {1}", "NoCrawl", settings.NoCrawl));
            Console.WriteLine(string.Format("  {0} - {1}", "ParentTemplate", settings.ParentTemplate));
            Console.WriteLine(string.Format("  {0} - {1}", "RequestAccessEmail", settings.RequestAccessEmail));
            Console.WriteLine(string.Format("  {0} - {1}", "SiteLogo", settings.SiteLogo));
            Console.WriteLine(string.Format("  {0} - {1}", "Title", settings.Title));
            Console.WriteLine(string.Format("  {0} - {1}", "WelcomePage", settings.WelcomePage));
        }

    }
}
