using System;
using OfficeDevPnP.Core.Framework.Provisioning.Model;
using System.Security;
using System.IO;

namespace <%= namespace %>.Jobs
{
    public class RunProvisioningXml : JobBase 
    {
        private static ConsoleColor defaultForeground = ConsoleColor.DarkCyan;

        public RunProvisioningXml(string siteUrl, string domain, string userName, SecureString pwdS) : base(siteUrl, domain, userName, pwdS) {

        }
        public void Start(string fileName, DirectoryInfo directory, string options, string provisionResourceFolder = null)
        {
            ProvisioningTemplate template = null;
            
            using (var ctx = base.GetClientContext())
            {
                if (provisionResourceFolder == null)
                    template = ProvisioningHelper.GetProvisioningTemplateFromResourcePath(fileName, directory);
                else
                    template = ProvisioningHelper.GetProvisioningTemplateFromResourcePath(fileName, directory, provisionResourceFolder);
                ProvisioningHelper.ReportOnTemplateStats(template);
                if (options.ToLower().IndexOf("quiet") < 0)
                {
                    Console.WriteLine("");
                    Console.WriteLine("Continue (Y/N):");
                    string YesNo = Console.ReadLine();
                    if (YesNo.ToLower().IndexOf('n') >= 0)
                        return;
                }
                
                ProvisioningHelper.ApplyCustomTemplateToSite(defaultForeground, ctx, template);

            }
        }
    }
}
