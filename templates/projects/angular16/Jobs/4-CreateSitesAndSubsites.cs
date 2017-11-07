using System;
using System.Linq;
using System.Security;
using Microsoft.SharePoint.Client;
using System.Configuration;


namespace <%= namespace %>.Jobs
{
    /// <summary>
    /// Create sites and subsites based on config values.
    /// </summary>
    public class CreateSitesAndSubsites : JobBase
    {
        private readonly String m_SubSitesList = null;
        public CreateSitesAndSubsites(string siteUrl, string domain, string userName, SecureString pwdS) : base(siteUrl, domain, userName, pwdS) {
            m_SubSitesList = ConfigurationManager.AppSettings["SubSitesList"] != null ? ConfigurationManager.AppSettings["SubSitesList"].ToString() : null;
        }

        /// <summary>
        /// Create sites and subsites.
        /// </summary>
        public void Start()
        {
            using (var ctx = base.GetClientContext())
            {

                if (String.IsNullOrEmpty(m_SubSitesList))
                {
                    Console.WriteLine("\nThere are no subsites configured listed. Please add the sites in the app.config file.");
                    return;
                }
                Console.WriteLine("\nCreating sub sitesF.");
                var sites = m_SubSitesList.Split(',').ToList();
                var site = ctx.Site;
                ctx.Load(site);
                ctx.Load(site, s => s.RootWeb);
                ctx.ExecuteQuery();

                ctx.Load(site.RootWeb.Lists);
                ctx.ExecuteQuery();

                //var pageLib = site.RootWeb.Lists.FirstOrDefault(r => r.Title == "Pages");
                //if (pageLib != null)
                var lifeCareerPage = @"/Pages/LifeAndCareer.aspx";
                var newsPage = @"/Pages/News.aspx";

                Web web = null;
                sites.ForEach(
                    w =>
                        {
                            web = CreateOrGetSubsite(ctx, ctx.Site.RootWeb.Title, w.Trim(), w.Trim());
                            if (web != null)
                            {
                                Console.WriteLine(String.Format("\n{0} subsite successfully created.", w.Trim()));

                                Console.WriteLine("Applying Masterpage for the site. Please wait...");
                                SetMasterPage(ctx, web);
                                Console.WriteLine("Site Masterpage applied.");

                                //Console.WriteLine("Setting home page...");
                                //ctx.Load(web.Lists);
                                //ctx.ExecuteQuery();
                                //var p = web.Lists.FirstOrDefault(a => a.Title == "Pages");
                                //ctx.Load(p, g => g.RootFolder);
                                //ctx.ExecuteQuery();
                                //switch (web.Title)
                                //{
                                //    case "LifeAndCareer":
                                //        CopyHomePage(ctx, lifeCareerPage, p, "LifeAndCareer.aspx");
                                //        SetWelcomePage(ctx, web, "Pages/LifeAndCareer.aspx");
                                //        break;
                                //    case "News":
                                //        CopyHomePage(ctx, newsPage, p, "News.aspx");
                                //        SetWelcomePage(ctx, web, "Pages/News.aspx");
                                //        break;
                                //}
                                //Console.WriteLine("Done.");


                                var subsites = ConfigurationManager.AppSettings[String.Format("{0}SubSites", w.Trim())] != null ? ConfigurationManager.AppSettings[String.Format("{0}SubSites", w.Trim())].ToString() : null;
                                if (String.IsNullOrEmpty(subsites))
                                    Console.WriteLine(String.Format("\n{0} site successfully created.", web.Title));
                                else
                                {
                                    Console.WriteLine(String.Format("\nFound subsites for {0} site.", w.Trim()));

                                    subsites.Split(',').ToList().ForEach(r =>
                                    {
                                        var s = CreateOrGetSubsite(ctx, web.Title, r.Trim(), r.Trim());
                                        if (s != null)
                                        {
                                            ctx.Load(s);
                                            ctx.ExecuteQuery();
                                            SetMasterPage(ctx, s);
                                            Console.WriteLine(String.Format("\n{0} subsite successfully created at URL {1}.", r.Trim(), s.ServerRelativeUrl));
                                        }
                                    });
                                }
                            }
                        });
            }
        }
        /// <summary>
        /// Copy homepage from root site.
        /// </summary>
        /// <param name="ctx"></param>
        /// <param name="sourceFilePath"></param>
        /// <param name="sourceList"></param>
        /// <param name="pageName"></param>
        private static void CopyHomePage(ClientContext ctx, string sourceFilePath, List sourceList, String pageName)
        {
            try
            {
                using (var fileInfo = Microsoft.SharePoint.Client.File.OpenBinaryDirect(ctx, sourceFilePath))
                {
                    Microsoft.SharePoint.Client.File.SaveBinaryDirect(ctx, String.Format("{0}/{1}", sourceList.RootFolder.ServerRelativeUrl, pageName), fileInfo.Stream, true);
                }

                ctx.Load(sourceList.RootFolder.Files);
                ctx.ExecuteQuery();

                var hp = sourceList.RootFolder.Files.FirstOrDefault(r => r.Name == pageName);
                if (hp != null)
                {
                    hp.CheckIn("", CheckinType.MajorCheckIn);
                    ctx.ExecuteQuery();
                    hp.Publish("");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
        }

        /// <summary>
        /// Set welcome page for the site.
        /// </summary>
        /// <param name="ctx"></param>
        /// <param name="web"></param>
        /// <param name="pageURL"></param>
        private static void SetWelcomePage(ClientContext ctx, Web web, string pageURL)
        {
            try
            {
                web.RootFolder.WelcomePage = pageURL;
                web.RootFolder.Update();
                ctx.ExecuteQuery();
            }
            catch (Exception)
            {
                throw;
            }
        }
        /// <summary>
        /// Sets master page.
        /// </summary>
        /// <param name="ctx"></param>
        /// <param name="web"></param>
        /// <param name="masterpageURL"></param>
        private static void SetMasterPage(ClientContext ctx, Web subWeb)
        {
            try
            {
                Web rootWeb = ctx.Site.RootWeb;
                ctx.Load(rootWeb, w => w.ServerRelativeUrl);
                ctx.ExecuteQuery();
                string masterPageUrl = string.Format("{0}/{1}", rootWeb.ServerRelativeUrl.TrimEnd('/'), "_catalogs/masterpage/CNET/cnc.master");

                subWeb.CustomMasterUrl = masterPageUrl;
                subWeb.MasterUrl = masterPageUrl;
                subWeb.Update();
                ctx.Load(subWeb);
                ctx.ExecuteQuery();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
        }
        /// <summary>
        /// Creates/returns News subsite obj.
        /// </summary>
        /// <param name="ctx"></param>
        /// <returns></returns>
        private static Web CreateOrGetSubsite(ClientContext ctx, String webName, String subsiteName, String description)
        {
            try
            {
                Console.WriteLine(String.Format("\nCreating subsite {0}, please wait...", subsiteName));
                Web web;
                Web newWeb = null;

                var site = ctx.Site;
                ctx.Load(site, r => r.RootWeb);
                ctx.ExecuteQuery();

                var webs = site.RootWeb.Webs;
                ctx.Load(webs);
                ctx.ExecuteQuery();

                web = webs.Any(r => r.Title == webName) == true ? webs.FirstOrDefault(r => r.Title == webName) : site.RootWeb;
                ctx.Load(web, w => w.Webs);
                ctx.ExecuteQuery();

                if (!web.Webs.Any(r => r.Title == subsiteName))
                    try
                    {
                        newWeb = web.CreateWeb(new OfficeDevPnP.Core.Entities.SiteEntity { Template= "blankinternet#0", Description = description, Title = subsiteName, Url = subsiteName }, true, true);
                    }
                    catch
                    {
                        ctx.RequestTimeout = 10 * 60 * 1000;
                        var information = new WebCreationInformation { Description = description, Title = subsiteName, Url = subsiteName, UseSamePermissionsAsParentSite = true, WebTemplate= "blankinternet#0" };
                        newWeb = web.Webs.Add(information);
                        ctx.ExecuteQueryRetry();
                    }
                else
                    newWeb = web.Webs.FirstOrDefault(r => r.Title == subsiteName);


                return newWeb;
            }
            catch (Exception)
            {
                throw;
            }
        }
    }
}
