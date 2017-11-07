using System;
using Microsoft.SharePoint.Client;
using System.Security;
using System.IO;

namespace <%= namespace %>.Jobs
{

    public class XMLTermItem
    {
        public XMLTermItem(string _name, string _Id) { Name = _name; Id = _Id; }
        public string Name { get; set; }
        public string Id { get; set; }
    }

    public class ProvisionGroupSites
    {
        private static string DateTimeStamp = DateTime.Now.Year + DateTime.Now.Month.ToString().PadLeft(2, '0') + DateTime.Now.Day.ToString().PadLeft(2, '0') + "_" + DateTime.Now.Hour.ToString().PadLeft(2, '0') + DateTime.Now.Minute.ToString().PadLeft(2, '0');
        private static ConsoleColor defaultForeground = ConsoleColor.DarkCyan;
        

        private string _userName;
        private SecureString _pwdS;
        private string _domain;
        
        public ProvisionGroupSites(string domain, string userName, SecureString pwdS)
        {            
            _userName = userName;
            _pwdS = pwdS;
            _domain = domain;
        }

        /// <summary>
        /// Create news pages, articles etc..
        /// </summary>
        public void Start(string fileName, DirectoryInfo directory)
        {
            // get the list of groups sites
            var sites = Properties.Settings.Default.GroupSitesStage;

            foreach (var url in sites)
            {
                using (var ctx = GetClientContext(url))
                {
                    var template = ProvisioningHelper.GetProvisioningTemplateFromResourcePath(fileName, directory);
                    ProvisioningHelper.ReportOnTemplateStats(template);                    
                    ProvisioningHelper.ApplyCustomTemplateToSite(defaultForeground, ctx, template);
                }
            }
            
        }
        protected ClientContext GetClientContext(string url)
        {
            ClientContext ctx;

            if (string.IsNullOrEmpty(_domain))
                ctx = new OfficeDevPnP.Core.AuthenticationManager().GetSharePointOnlineAuthenticatedContextTenant(url, _userName, _pwdS);
            else
                ctx = new OfficeDevPnP.Core.AuthenticationManager().GetNetworkCredentialAuthenticatedContext(url, _userName, _pwdS, _domain);

            return ctx;
        }
    }
}
