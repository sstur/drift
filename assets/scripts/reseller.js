function MM_preloadImages() {
  var d = document;
  if (d.images) {
    if (!d.MM_p) d.MM_p = new Array();
    var i, j = d.MM_p.length, a = MM_preloadImages.arguments;
    for (i = 0; i < a.length; i++)
      if (a[i].indexOf("#") != 0) {
        d.MM_p[j] = new Image;
        d.MM_p[j++].src = a[i];
      }
  }
}
function rowOverEffect(object) {
  if (object.className == 'productsRow') {
    object.className = 'productsRowOver';
  }
}
function rowOutEffect(object) {
  if (object.className == 'productsRowOver') {
    object.className = 'productsRow';
  }
}
function set_action() {
  var keyword = document.getElementById('menu_search_keyword').value;
  var type = document.getElementById('menu_search_type').value;
  if (keyword != '') {
    if (type == 'domain') {
      window.location = '/reseller/domain/domains_search?q=' + keyword + '&search_by=domain_name';
    } else if (type == 'hosting') {
      window.location = '/reseller/hosting/hosting_search?q=' + keyword + '&search_by=domain_name';
    } else if (type == 'product') {
      window.location = '/reseller/product/product_search?q=' + keyword + '&search_by=domain_name';
    } else if (type == 'email') {
      window.location = '/reseller/member/member_search_view?email=' + keyword;
    } else if (type == 'username') {
      window.location = '/reseller/member/member_search_view?username=' + keyword;
    } else if (type == 'last_name') {
      window.location = '/reseller/member/member_search_view?last_name=' + keyword;
    } else if (type == 'member_id') {
      window.location = '/reseller/member/member_search_view?member_id=' + keyword;
    }
  } else {
    alert('Keyword may not be blank');
  }
  return false;
}
