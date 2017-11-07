using Microsoft.SharePoint.Client;
using System.Security;

namespace <%= namespace %>.Jobs
{
    public class JobBase
    {
        protected string _siteUrl { get; set; }
        protected string _domain { get; set; }
        protected string _userName { get; set; }
        protected SecureString _pwdS { get; set; }


        public JobBase(string siteUrl, string domain, string userName, SecureString pwdS) {
            _siteUrl = siteUrl;
            _domain = domain;
            _userName = userName;
            _pwdS = pwdS;
        }
        protected ClientContext GetClientContext() {
            ClientContext ctx;

            if (string.IsNullOrEmpty(_domain))
                ctx = new OfficeDevPnP.Core.AuthenticationManager().GetSharePointOnlineAuthenticatedContextTenant(_siteUrl, _userName, _pwdS);
            else
                ctx = new OfficeDevPnP.Core.AuthenticationManager().GetNetworkCredentialAuthenticatedContext(_siteUrl, _userName, _pwdS, _domain);

            return ctx;
        }
    }
}
