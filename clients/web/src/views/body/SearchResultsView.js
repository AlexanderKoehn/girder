import $ from 'jquery';
import _ from 'underscore';

import View from 'girder/views/View';
import { restRequest } from 'girder/rest';
import router from 'girder/router';
import SearchPaginateWidget from 'girder/views/widgets/SearchPaginateWidget';
import SearchFieldWidget from 'girder/views/widgets/SearchFieldWidget';

import SearchResultsTemplate from 'girder/templates/body/searchResults.pug';
import SearchResultsTypeTemplate from 'girder/templates/body/searchResultsType.pug';
import 'girder/stylesheets/body/searchResultsList.styl';

/**
 * This view display all the search results by instantiating a subview
 * per each type found.
 */
var SearchResultsView = View.extend({
    events: {
        'click .g-search-result>a': function (e) {
            var result = $(e.currentTarget);
            this._resultClicked(result.data('resourceType'), result.data('resourceId'));
        }
    },

    initialize: function (settings) {
        this._query = settings.query;
        this._mode = settings.mode || 'text';
        // Give the display order of each type on the result view
        this._types = settings.types || ['collection', 'folder', 'item', 'group', 'user'];
        this._subviews = {};
        this._initResults = {};

        this._sizeOneElement = 28;
        this.pageLimit = 10;

        restRequest({
            url: 'resource/search',
            data: {
                q: this._query,
                mode: this._mode,
                types: JSON.stringify(_.intersection(
                    this._types,
                    SearchFieldWidget.getModeTypes(this._mode))
                ),
                limit: this.pageLimit
            }
        })
            .done((results) => {
                this._initResults = results;
                this.render();
            });
    },

    _calculateLength: function (results) {
        let length = 0;
        _.each(results, (result) => {
            length += result.length;
        });
        return length;
    },

    _parseResults: function (results) {
        return _.values(results)[0];
    },

    _getIcon: function (type) {
        const icons = {
            'user': 'user',
            'group': 'users',
            'collection': 'sitemap',
            'folder': 'folder',
            'item': 'doc-text-inv'
        };
        return icons[type];
    },

    render: function () {
        this.$el.html(SearchResultsTemplate({
            query: this._query || 'Undefined',
            length: this._calculateLength(this._initResults) || 0
        }));

        _.each(this._types, (type) => {
            if (this._initResults[type].length) {
                this._subviews[type] = new SearchResultsTypeView({
                    parentView: this,
                    name: `${type}ResultsView`,
                    query: this._query,
                    mode: this._mode,
                    type: type,
                    icon: this._getIcon(type),
                    limit: this.pageLimit,
                    initResults: this._initResults[type],
                    sizeOneElement: this._sizeOneElement
                })
                    .render();
                this._subviews[type].$el.appendTo(this.$('.g-search-results-container'));
            }
        });

        return this;
    },

    _resultClicked: function (type, id) {
        router.navigate(`${type}/${id}`, {
            trigger: true
        });
    }
});

/**
 * This subview display all the search results for one type.
 * It also contain a pagination widget that provide a consistent widget
 * for iterating amongst pages of a list of search results.
 */
var SearchResultsTypeView = View.extend({

    className: 'g-search-results-type-container',

    initialize: function (settings) {
        this._name = settings.name;
        this._query = settings.query;
        this._mode = settings.mode;
        this._type = settings.type;
        this._icon = settings.icon || 'icon-attention-alt';
        this._initResults = settings.initResults || [];
        this._pageLimit = settings.limit || 10;
        this._sizeOneElement = settings.sizeOneElement || 30;

        this._paginateWidget = new SearchPaginateWidget({
            parentView: this,
            type: this._type,
            query: this._query,
            mode: this._mode,
            limit: this._pageLimit
        })
            .on('g:changed', () => {
                this._results = this._paginateWidget.results;
                this.render();
            });

        this._results = this._initResults;
    },

    getCollectionName: function (types) {
        const names = {
            'collection': 'Collections',
            'group': 'Groups',
            'user': 'Users',
            'folder': 'Folders',
            'item': 'Items'
        };
        return names[types];
    },

    render: function () {
        this.$el.html(SearchResultsTypeTemplate({
            results: this._results,
            collectionName: this.getCollectionName(this._type),
            type: this._type,
            icon: this._icon
        }));

        /* This size of the results list cannot be known until after the fetch completes. And we don't want to set
        the 'min-height' to the max results size, because we'd frequently have lots of whitespace for short result
        lists. Do not try to move that set in stylesheet.
        */
        this.$('.g-search-results-type').css('min-height', `${this._initResults.length * this._sizeOneElement}px`);
        this._paginateWidget
            .setElement(this.$(`#${this._type}Paginate`))
            .render();

        return this;
    }
});

export default SearchResultsView;
