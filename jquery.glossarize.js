/**
 * Plugin Name: Glossarizer
 * Author : Vinay @Pebbleroad
 * Date: 02/04/2013
 * Description: Takes glossary terms from a JSON object -> Searches for terms in your html -> Wraps a abbr tag around the matched word
 * 1. Fixed IE8 bug where whitespace get removed - Had to change `abbr` tag to a block element `div`
 */

;(function($){
    $.extend({        
        inArrayIn: function(elem, arr, i){            
            if (typeof elem !== 'string'){
                return $.inArray.apply(this, arguments);
            }            
            if (arr){
                var len = arr.length;
                    i = i ? (i < 0 ? Math.max(0, len + i) : i) : 0;
                elem = elem.toLowerCase();
                for (; i < len; i++){
                    if (i in arr && arr[i].toLowerCase() == elem){
                        return i;
                    }
                }
            }            
            return -1;
        }
    });
})(jQuery);

;(function($){

	/**
	 * Defaults
	 */
	
	var pluginName = 'glossarizer',
		defaults = {
			sourceURL     : '', /* URL of the JSON file with format {"term": "", "description": ""} */			
			replaceTag    : 'abbr', /* Matching words will be wrapped with abbr tags by default */
			lookupTagName : 'p, ul, a', /* Lookup in either paragraphs or lists. Do not replace in headings */
			callback      : null, /* Callback once all tags are replaced: Call or tooltip or anything you like */
			replaceOnce   : false /* Replace only once in a TextNode */,
			replaceClass: 'glossarizer_replaced'			
		}

	/**
	 * Constructor
	 */
	
	function Glossarizer(el, options){

		var base = this

		base.el = el;

		/* Element */
		base.$el            = $(el)

		/* Extend options */

		base.options        = $.extend({}, defaults, options)

		base.isIE8 = !document.addEventListener;

		if(base.isIE8){
			base.options.replaceTag = 'div';
		}

		/**
		 * Terms
		 */
		
		base.terms = [];

		base.excludes = [];

		base.replaced = [];
		

		/**
		 * Regex Tags
		 */
		
		base.regexOption = base.options.replaceOnce? 'i': 'ig';
		
		
		/*
		Fetch glossary JSON
		 */
		
	

		$.getJSON(this.options.sourceURL).then(function(data){

			base.glossary = data;
			
			if(!base.glossary.length || base.glossary.length == 0) return;			
			
			/**
			 * Get all terms
			 */
			
			for(var i =0; i< base.glossary.length; i++){
				
				var terms = base.glossary[i].term.split(',');

				for(var j = 0; j < terms.length; j++){

					/* Trim */

					var trimmed = terms[j].replace(/^\s+|\s+$/g, ''),
						isExclusion = trimmed.indexOf('!');
					
					if(isExclusion == -1 || isExclusion != 0){

						/* Glossary terms array */
						
						base.terms.push(trimmed)

					}else{

						/* Excluded terms array */
						
						base.excludes.push(trimmed.substr(1));
					}
				}
				
				
			}
			

			/**
			 * Wrap terms
			 */
			
			base.wrapTerms();

		})

		

	}

	/**
	 * Prototypes
	 */
	Glossarizer.prototype = {		

		getDescription: function(term){			

			var regex = new RegExp('(^\s*|[^\!])'+term+'\\s*|\\,$', 'i');

			/**
			 * Matches
			 * 1. Starts with \s* (zero or more spaces)
			 * 2. or does not contain !
			 * 3. Ends with zero or more spaces
			 * 4. Ends with comma
			 */

			for(var i =0; i< this.glossary.length; i++){				

				if(this.glossary[i].term.match(regex)){
					return this.glossary[i].description
				}				
			}				

		},
		
		/**
		 * Wraps the matched terms by calling traverser     
		 */
		wrapTerms: function(){
			
			var nodes = this.el.querySelectorAll(this.options.lookupTagName)					

			for(var i =0; i < nodes.length; i++){
				this.traverser(nodes[i])
			}      

			/**
			 * Callback
			 */
			
			if(this.options.callback) this.options.callback.call(this.$el)

		},

		/**
		 * Traverses through nodes to find the matching terms in TEXTNODES
		 */

		traverser: function(node){      
			
			var next,
				base = this;

			if (node.nodeType === 1) {

				/*
				 Element Node
				 */

				//console.log(node.nodeName)
				if (node = node.firstChild) {
						do {
							// Recursively call traverseChildNodes
							// on each child node
							next = node.nextSibling

							/**
							 * Check if the node is not glossarized
							 */

							if(	node.nodeName != 'ABBR' && 
								node.className != this.options.replaceClass)
							{
								
								this.traverser(node)

							}

						} while(node = next)
				}

			} else if (node.nodeType === 3) {

				/*
				 Text Node
				 */

				var temp = document.createElement('div'),
					data = node.data;                      

				temp.style.cssText = "white-space: pre;";

				var re = new RegExp('\\b('+this.terms.join('|')+ ')\\b', base.regexOption),
					reEx = new RegExp('\\b('+this.excludes.join('|')+ ')\\b', base.regexOption);
				
				
				if(re.test(data)){      

					var excl = reEx.exec(data);    
					//console.log(data)
					data = data.replace(re,function(match, item , offset, string){
						

						if($.inArrayIn(match, base.replaced) >= 0){

							return match;
						}
						
						base.replaced.push(match);
						

						var ir = new RegExp('\\b'+match+'\\b'),
							result = ir.exec(data)
											

						if(result){

							if(excl){
								
								var id = offset,
									exid = excl.index,
									exl = excl.index + excl[0].length;
								
								if(exid <= id && id <= exl){

									return match;
									
								}else{

									return '<'+base.options.replaceTag+' class=\"'+base.options.replaceClass+'\" title="'+base.getDescription(match)+'">'+ match + '</'+base.options.replaceTag+'>'

								}
							}
							else{

								return '<'+base.options.replaceTag+' class=\"'+base.options.replaceClass+'\" title="'+base.getDescription(match)+'">'+ match + '</'+base.options.replaceTag+'>'
							}
						}
						

					});

					/**
					 * Only replace when a match is found					 
					 * Using jQuery html()
					 */
					
					$(temp).html(data)

					
				
					while (temp.firstChild) {          
						node.parentNode.insertBefore(temp.firstChild, node)
					}

					node.parentNode.removeChild(node)

				}

			}

		},

	};

	function is_all_ws( nod )
{
  // Use ECMA-262 Edition 3 String and RegExp features
  return !(/[^\t\n\r ]/.test(nod.textContent));
}

	/**
	 * Public Methods
	 */
	
	var methods = {

		destroy: function(){			

			this.$el.removeData('plugin_' + pluginName);

			/* Remove abbr tag */
			this.$el.find('.' + this.options.replaceClass).each(function(){

				var $this = $(this),
					text = $this.text();


				$this.replaceWith(text)

			})
			
		}
	}


	/**
	 * Extend Prototype
	 */
	
	Glossarizer.prototype = $.extend({}, Glossarizer.prototype, methods)

	/**
	 * Plugin
	 * @param  {[type]} options   
	 */
	$.fn[pluginName] =function(options){

		return this.each(function(){


			var $this = $(this),
				glossarizer = $this.data('plugin_' + pluginName);

			/*
			Check if its a method
			 */
			
			if(typeof options == "string" && glossarizer  && methods.hasOwnProperty(options) ){

				glossarizer[options].apply(glossarizer)

			}else{

				/* Destroy if exists */

				if(glossarizer) glossarizer['destroy'].apply(glossarizer);


				/* Initialize */
			
				$.data(this, 'plugin_' + pluginName, new Glossarizer(this, options))
			}
		});

	}


})(jQuery);
