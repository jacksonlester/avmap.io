let adBlocked = true;

const Prestitial = ($) => { 
    function fromEmail() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("utm_source") == "jolt" && urlParams.get("utm_medium") == "email";
    }

    function show() {
        const prestitialDiv = document.getElementById("prestitial");
        if (!prestitialDiv) {
            return;    
        } 
        $("#prestitial-overlay").show();
        
        prestitialDiv.style.removeProperty("opacity");

        window.scrollTo(0, 0);
    }

    function hide() {
        const bodyDiv = $("#body-wrapper");
        if(bodyDiv.length !== 0) {
            if (bodyDiv.length > 0 && bodyDiv.css("opacity") === '0') bodyDiv.css("opacity", '');
        }

        const prestitialEl = $('#prestitial');
        if(prestitialEl.length !== 0) {
            prestitialEl.addClass( "prestitial-no-show" );
            if (prestitialEl.css("opacity") !== '0') {
                window.scrollTo(0, 0)
            }
            prestitialEl.remove();
        }
    }

    function register() {
        adBlocked = false;
        $("#prestitial").click(function () {
            hide();
        });
        show();
        sessionStorage.setItem("prestitial_shown", true);

    }

    if (fromEmail() || sessionStorage.getItem("prestitial_shown") || isSponsoredContent()) {
        hide();
        return null;
    }

    try {
        var showLogo  = true;
        var logoStyle = "";
        if ( '0' == PRESTITIALINFO.logoHeight || 0 == PRESTITIALINFO.logoWidth ) {
            showLogo = false;
        }

        if ( showLogo ) {
            if ( 'svg' == PRESTITIALINFO.siteLogo ) {
                logoStyle = "width:" + PRESTITIALINFO.logoWidth + "% !important;margin-top:-15% ";
            } else {
                logoStyle = "max-height:" + PRESTITIALINFO.logoHeight + "px;" + ( "white" === PRESTITIALINFO.backgroundColor ? "background-color:white;padding:5px;" : "" );
            }            
        } else {
            logoStyle = "display:none;";
        }

        var additionalLogoStyles = "";
        if ( 'svg' == PRESTITIALINFO.siteLogo ) {
            additionalLogoStyles = "background-color: unset !important;border-bottom: unset !important;";
        }

        logoHTML = '';
        if ( 'svg' == PRESTITIALINFO.siteLogo ) {
            logoHTML = "<a href=\""+PRESTITIALINFO.siteUrl+"\" style=\""+logoStyle+"\">"+PRESTITIALINFO.siteName+"</a>";
        } else {
            logoHTML = "<a href=\""+PRESTITIALINFO.siteUrl+"\"><img style=\""+logoStyle+"\" src=\""+PRESTITIALINFO.siteLogo+"\"></a>";
        }

        $( "#prestitial-grid" ).append(
            "<div class=\"prestitial-logo"+( 'svg' == PRESTITIALINFO.siteLogo ? " site-header" : "" )+"\" style=\""+additionalLogoStyles+"\">"+
                "<div class=\"title-area\">"+
                    "<h1 class=\"site-title\" style=\"margin: 0;\">"+
                    logoHTML+
                    "</h1>"+
                "</div>"+
            "</div>"+
            "<div class=\"close-cta\">"+
            "Continue to Site <i class=\"fa fa-arrow-right\"></i>"+
            "</div>"+
            "<div id=\"prestitial-banner\">"+
                "<div id=\"gam-holder-prestitial-banner\" class=\"gam-holder\" style=\"min-width: 300px; min-height: 225px;\">"+
                    "<script>googletag.cmd.push(function() { googletag.display('gam-holder-prestitial-banner'); });</script>"+
                "</div>"+
            "</div>"
        );
    } catch (err) {
        console.error("prestitial: ", err);
    }

    return {
        register,
        hide
    };
};

const isSponsoredContent = () => {
    const {pathname} = window.location;
    if (pathname.includes("sponsored_content")) return true;
    return false;
};

(function ($) {
    let prestitial            = null;
    let foundPrestitialAdSlot = false;
    let prestitialEl          = $( "#prestitial" ); 

    if ( prestitialEl.length > 0 ) { 
        prestitial = Prestitial( $ ); 
    }

    window.googletag = window.googletag || {cmd: []};
    googletag.cmd.push(function () {
        googletag.pubads().getSlots().forEach( ( slot ) => {
            if ( prestitial !== null && slot.getSlotId().getDomId() == "gam-holder-prestitial-banner" ) {
                foundPrestitialAdSlot = true;                
            }
        } );

        if ( prestitial !== null && ! foundPrestitialAdSlot ) {
            prestitial.hide();
        } else if ( prestitial !== null && foundPrestitialAdSlot ) {
            googletag.pubads().addEventListener( "slotRenderEnded", function ( slotRenderEndedEvent ) {
                if ( slotRenderEndedEvent.slot.getSlotElementId() == "gam-holder-prestitial-banner" ) {
                    
                    if ( ! slotRenderEndedEvent.isEmpty ) {
                        prestitial.register();
                    } else {
                        prestitial.hide();
                    }
                }
            } );            
        }
    });

    // Checks for blocked ad and the prestitial not shown...
    setTimeout(function () {
        if (adBlocked) {
            if(prestitial !== null) prestitial.hide();
        }
    }, 2000);
})(jQuery);