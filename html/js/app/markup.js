define(['underscore-contrib', 'ko', 'windows', 'app/main-window', 'app/routes', 'app/utils', 'app/entity-view', 'app/data', 'jquery','bootstrap', 'bootstrap.colorpicker'], function(_, ko, windows, main_window, routes, utils, entity_view, data, $){

  var current_training = null;
  var container_scope = null;

  var tagBuilder = function(el, entityType){
    var mousedown_handler = function(e){
      if (e.button == 2){
        var scopeEl = this;
        entity_view.render(main_window.panelRef, 
                           { 
                             entity: $(scopeEl).html(), 
                             current: entityType,
                             remove: function(){
                               $(scopeEl).children().first().unwrap();
                             },
                             onSave: function(entityType){
                               $(scopeEl).removeClass();
                               tagBuilder(scopeEl, entityType);
                             }
                           });

        return false;
      }
      return true;
    };

    $(el).addClass("tag").addClass(entityType).mousedown(mousedown_handler);
  };

  var highlighted_mousedown_handler = function(e){
    if (e.button == 2){
      main_window.panelOpen();
      var scopeEl = this;
      entity_view.render(main_window.panelRef, 
                         { entity: $(this).html(), 
                           onSave: function(entityType){
                             $(scopeEl).removeClass("highlight");
                             tagBuilder(scopeEl, entityType);
                           }
                         });
      //containerViewModel.panelToggle();
      //open some dialog selection 
      return false;
    }
    return true;
  };

  var highlightBuilder = function(el){
    var div = $('<div>').addClass("highlight");
    div.mousedown(highlighted_mousedown_handler);
    $(el).wrap(div); 
  };

  var span_click_handler = function(highlightEl, span){
    var right = span.nextAll().first();
    var left = span.prevAll().first();
    main_window.panelClose();

    // start new highlight
    if (_.not(_.some(highlightEl)) && _.not(span.parent().hasClass("tag"))){
      highlightBuilder(span);
      return;
    }

    if ($(span).parent().hasClass("highlight")){
      //remove highlighting if only 1 word is highlighted
      if (_.every([_.not(left.is("span")), _.not(right.is("span"))])){
        $(span).unwrap();
        return;
      }
      
      //cannot unhighlight tokens from the middle 
      if (_.every([_.some(left.is("span")), _.some(right.is("span"))])){
        return;
      }

      // remove from end
      if (_.every([left.is("span"), _.not(right.is("span"))])){
        $(span).detach().insertAfter(highlightEl);
        return;
      }
      
      // remove from begining 
      if (_.every([_.not(left.is("span")), right.is("span")])){
        $(span).detach().insertBefore(highlightEl);
        return;
      }
      //??
      return;
    }

    if (right.is(highlightEl)){
      span.detach().prependTo(highlightEl);
      return;
    }

    if (left.is(highlightEl)){
      span.detach().appendTo(highlightEl);
      return;
    }
  };

  var view = function(){
    var deferred = new $.Deferred();
    require(['text!templates/markup_view.html'], function(tmpl){
      deferred.resolve(tmpl);
    });
    return deferred.promise();
  };

  var getTags = function(){
    var tagged = _.map(container_scope.find('.tag'), function(tag){
      var t = $(tag).attr('class').replace('tag', '').trim();
      var start = +$(tag).children().first().attr('data-index');
      var end = +$(tag).children().last().attr('data-index') + 1;
      return [start, end, t];
    });
    return tagged;
  };

  var save = function(){
    console.log(current_training);
    data.clearTags(current_training);
    var addTag = _.partial(data.addTag, current_training);

    _.each(getTags(), function(t){
      addTag(t[0], t[1], t[2]);
    });

    utils.navigate(routes.HOME());
  };

  var render = function(el, i){

    container_scope = el;
    current_training = i;

    var highlight_handler = function(v){ 
      highlightBuilder(this);
    };

    var mousedown_handler = function(e){ 
      if( e.button == 2) { 
        $('#markup-container').find('.highlight').each(highlight_handler);
        return false;
      }
      return true;
    };

    view().then(function(tmpl){
      el.html(tmpl);
      var container = el.find(".markup-container").first();

      container.append(
        _.map(data.trainings[i].tokens,
              function(str, i){ return $('<span>').html(str).attr("data-index", i);
                       }));

      //#global ref
      $('#widget-canvas').mousedown(mousedown_handler);

      container.find('span').each(function(){
        $(this).on('click', function(){
          span_click_handler(el.find("div.highlight").first(), $(this));
        });
      });

      _.each(data.trainings[i].tags, function(tag){
        var spans = _.filter(el.find('span'), function(e){
          var i = parseInt($(e).attr('data-index'));
          return _.every(
            [_.gte(i, tag.start), 
             _.lt(i, tag.end)]);
        });
        
        var div = $('<div>');
        div.mousedown(highlighted_mousedown_handler);
        $(spans).wrapAll(div);

        var p = $(spans).parent();
        _.defer(function(){
          tagBuilder(p, tag.tag);
        });
      });

      var cancel = _.partial(utils.navigate, routes.HOME())
      
      ko.applyBindings({ 'save': save, 'cancel' : cancel }, el[0]);
    });


  };

  return {
    render : render
  };
});