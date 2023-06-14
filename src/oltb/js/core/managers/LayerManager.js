import { Events } from '../../helpers/constants/Events';
import { LogManager } from '../managers/LogManager';
import { FeatureProperties } from '../../helpers/constants/FeatureProperties';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { hasCustomFeatureProperty } from '../../helpers/browser/HasNestedProperty';

const FILENAME = 'managers/LayerManager.js';
const DEFAULT_LAYER_NAME = 'New layer';

const ZINDEX_BASE_MAP_LAYER = 1;
const ZINDEX_BASE_FEATURE_LAYER = 10000;

class LayerManager {
    static #map;
    static #activeFeatureLayer;
    static #layerId = 0;

    static #queue = {
        mapLayers: [],
        featureLayers: []
    };

    static #layers = {
        mapLayers: [],
        featureLayers: []
    };

    static init() {
        LogManager.logDebug(FILENAME, 'init', 'Initialization started');
    }

    static setMap(map) { 
        LogManager.logInformation(FILENAME, 'setMap', {
            adding: {
                mapLayers: this.#queue.mapLayers.length,
                featureLayers: this.#queue.featureLayers.length
            }
        });

        this.#map = map;

        // Handle queue of map-layers that was added before the map was ready
        this.#queue.mapLayers.forEach((item) => {
            this.addMapLayerToMap(item.layerWrapper, item.silent);
        });

        this.#queue.mapLayers = [];

        // Handle queue of feature-layers that was added before the map was ready
        this.#queue.featureLayers.forEach((item) => {
            this.addFeatureLayerToMap(item.layerWrapper, item.silent);
        });

        this.#queue.featureLayers = [];
    }

    static #addPropertiesInterface(layerWrapper) {
        layerWrapper.getLayer = function() {
            return this.layer;
        }

        layerWrapper.setLayer = function(layer) {
            this.layer = layer;
        }

        layerWrapper.getName = function() {
            return this.name;
        }

        layerWrapper.setName = function(name) {
            this.name = name;
        }

        layerWrapper.getId = function() {
            return this.id;
        }

        layerWrapper.setId = function(id) {
            this.id = id;
        }
    }

    static #setIdAndZIndex(zBase, layerWrapper) {
        layerWrapper.setId(this.#layerId);
        layerWrapper.getLayer().setZIndex(zBase + this.#layerId);

        this.#layerId += 1;
    }

    //-------------------------------------------
    // Map layers specific
    //-------------------------------------------

    static addMapLayers(layerWrappers, silent = false) {
        for(let index in layerWrappers) {
            this.addMapLayer(layerWrappers[index], silent);
        }
    }

    static addMapLayer(layerWrapper, silent = false) {
        LogManager.logDebug(FILENAME, 'addMapLayer', layerWrapper.name);

        this.#addPropertiesInterface(layerWrapper);
        this.#setIdAndZIndex(ZINDEX_BASE_MAP_LAYER, layerWrapper);

        if(this.#map) {
            this.addMapLayerToMap(layerWrapper, silent);
        }else {
            this.#queue.mapLayers.push({
                layerWrapper: layerWrapper, 
                silent: silent
            });
        }
    }

    static addMapLayerToMap(layerWrapper, silent = false) {
        this.#layers.mapLayers.push(layerWrapper);
        this.#map.addLayer(layerWrapper.getLayer());

        window.dispatchEvent(new CustomEvent(Events.custom.mapLayerAdded, {
            detail: {
                layerWrapper: layerWrapper, 
                silent: silent
            }
        }));
    }

    static removeMapLayer(layerWrapper, silent = false) {
        LogManager.logDebug(FILENAME, 'removeMapLayer', layerWrapper.getName());

        // Remove the layer from the internal collection
        this.#layers.mapLayers = this.#layers.mapLayers.filter(function(layer) {
            return layer.getId() !== layerWrapper.getId();
        }); 

        // Remove the actual ol layer
        this.#map.removeLayer(layerWrapper.getLayer());

        window.dispatchEvent(new CustomEvent(Events.custom.mapLayerRemoved, {
            detail: {
                layerWrapper: layerWrapper, 
                silent: silent
            }
        }));
    }

    static getMapLayers() {
        return this.#layers.mapLayers;
    }

    static getMapLayerById(id) {
        const result = this.#layers.mapLayers.find((layerWrapper) => {
            return layerWrapper.getId() === id;
        });

        return result;
    }

    static getOlMapLayers() {
        const layers = [];

        // Filter out the actual ol layer
        for(let index in this.#layers.mapLayers) {
            layers.push(this.#layers.mapLayers[index].getLayer());
        }

        return layers;
    }

    static setTopMapLayerAsOnlyVisible() {
        this.#layers.mapLayers.forEach((layerWrapper) => {
            layerWrapper.getLayer().setVisible(false);
        });
    
        if(!this.isMapLayersEmpty()) {
            this.#layers.mapLayers[0].getLayer().setVisible(true);
        }
    }

    static getMapLayerSize() {
        return this.#layers.mapLayers.length;
    }

    static isMapLayersEmpty() {
        return this.getMapLayerSize() === 0;
    }

    //-------------------------------------------
    // Feature layers specific
    //-------------------------------------------

    static #validateName(name) {
        name = name.trim();

        if(!name.length) {
            name = DEFAULT_LAYER_NAME;
        }

        return name;
    }

    static addFeatureLayer(name, visible = true, silent = false) {
        name = this.#validateName(name);
        LogManager.logDebug(FILENAME, 'addFeatureLayer', name);

        const layerWrapper = {
            name: name,
            layer: new VectorLayer({
                source: new VectorSource(),
                visible: visible
            })
        };

        this.#addPropertiesInterface(layerWrapper);
        this.#setIdAndZIndex(ZINDEX_BASE_FEATURE_LAYER, layerWrapper);

        this.#activeFeatureLayer = layerWrapper;

        if(this.#map) {
            this.addFeatureLayerToMap(layerWrapper, silent);
        }else {
            this.#queue.featureLayers.push({
                layerWrapper: layerWrapper, 
                silent: silent
            });
        }

        return layerWrapper;
    }

    static addFeatureLayerToMap(layerWrapper, silent = false) {
        this.#layers.featureLayers.push(layerWrapper);
        this.#map.addLayer(layerWrapper.getLayer());

        window.dispatchEvent(new CustomEvent(Events.custom.featureLayerAdded, {
            detail: {
                layerWrapper: layerWrapper, 
                silent: silent
            }
        }));
    }

    static #getNextActiveFeatureLayer() {
        return (!this.isFeatureLayersEmpty() 
            ? this.#layers.featureLayers[this.#layers.featureLayers.length - 1] 
            : null
        );
    }

    static removeFeatureLayer(layerWrapper, silent = false) {
        LogManager.logDebug(FILENAME, 'removeFeatureLayer', layerWrapper.getName());

        // Remove the layer from the internal collection
        this.#layers.featureLayers = this.#layers.featureLayers.filter(function(layer) {
            return layer.getId() !== layerWrapper.getId();
        }); 

        // Remove overlays associated with each feature
        layerWrapper.getLayer().getSource().getFeatures().forEach((feature) => {
            if(hasCustomFeatureProperty(feature.getProperties(), FeatureProperties.tooltip)) {
                this.#map.removeOverlay(feature.getProperties().oltb.tooltip);
            }
        });

        // Remove the actual ol layer
        this.#map.removeLayer(layerWrapper.getLayer());

        // Sett another layer as active if exists
        this.#activeFeatureLayer = this.#getNextActiveFeatureLayer();

        window.dispatchEvent(new CustomEvent(Events.custom.featureLayerRemoved, {
            detail: {
                layerWrapper: layerWrapper, 
                silent: silent
            }
        }));
    }

    static getActiveFeatureLayer(options = {}) {
        if(!this.#activeFeatureLayer) {
            this.addFeatureLayer(options.fallback);
        }

        return this.#activeFeatureLayer;
    }

    static setActiveFeatureLayer(layer) {
        this.#activeFeatureLayer = layer;
    }

    static getFeatureLayers() {
        return this.#layers.featureLayers;
    }

    static removeFeatureFromLayer(feature) {
        this.getFeatureLayers().forEach((layerWrapper) => {
            layerWrapper.getLayer().getSource().removeFeature(feature);
        });
    }

    static getFeatureLayerSize() {
        return this.#layers.featureLayers.length;
    }

    static isFeatureLayersEmpty() {
        return this.getFeatureLayerSize() === 0;
    }
}

export { LayerManager };