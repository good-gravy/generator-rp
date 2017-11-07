using System;
using OfficeDevPnP.Core.Framework.Provisioning.Model;
using System.Security;

namespace <%= namespace %>.Jobs
{
    public class GetProvisioningXml : JobBase
    {
        private static string DateTimeStamp = DateTime.Now.Year + DateTime.Now.Month.ToString().PadLeft(2, '0') + DateTime.Now.Day.ToString().PadLeft(2, '0') + "_" + DateTime.Now.Hour.ToString().PadLeft(2, '0') + DateTime.Now.Minute.ToString().PadLeft(2, '0');
        private static ConsoleColor defaultForeground = ConsoleColor.DarkCyan;

        public GetProvisioningXml(string siteUrl, string domain, string userName, SecureString pwdS) : base(siteUrl, domain, userName, pwdS) {

        }
        public void Start(string outputFolder)
        {
            using (var ctx = base.GetClientContext())
            {                
                // GET the template from existing site and serialize it
                ProvisioningTemplate template = ProvisioningHelper.GenerateProvisioningTemplate(defaultForeground, ctx, outputFolder, "SiteExport_" + DateTimeStamp + ".xml");
            }
        }

    }
}
