/*
 *  Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 */

import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './AverageTransactionAmountGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';

//TODO:: complex equals
//TODO:: legend square
//TODO:: show loading when query changes

/**
 * Displays a graph on average payment transaction amounts broken down as SCA and Exempted.
 */
class AverageTransactionAmountGraph extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            dataProviderConf: null,
            metadata: null,
            tableConfig:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isInitialized :false
        };
        this._handleDataReceived = this._handleDataReceived.bind(this);
        this.updateWidgetConf = this.updateWidgetConf.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);

    }

    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({
                    dataProviderConf :  message.data.configs.providerConfig
                });
                //Subscribes to the DateTimeRangePicker widget.
                super.subscribe(this.setReceivedMsg);
                if (!this.state.isInitialized) {
                    //Sends initialization message to the DateTimeRangePicker widget.
                    super.publish("init");
                }
            })
            .catch((error) => {
                console.log("error", error);
            });

    }

    /**
     * Sets the state of the widget after receiving data from the provider.
     */
    _handleDataReceived(data) {
        // console.log(data);

        if (data === -1) {
            this.setState({gData:[]});
        }else {
            this.setState({gData: this.convertDataToInt(data.data)});
        }
    }

    /**
     * Handles the resizing of a widget component.
     */
    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    /**
     * Handles the message received from the DateTimeRangePicker widget.
     */
    setReceivedMsg(receivedMsg) {
        if (receivedMsg === "init") {
            this.defaultFilter();
        }

        this._handleDataReceived(-1);
        this.updateWidgetConf(receivedMsg)
    }

    /**
     * Updates the providerConf of the widgetConf with a new SQL query.
     * Updates the config and metadata of the charts with new axis data.
     */
    updateWidgetConf (dTRange){
       // this.setState({ tValue:value });
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        //renameToChartConfig
        let nTableConfig = {
            x: dTRange.type,
            charts: [
                {
                    type: "line",
                    y: "amount(£)",
                    color: "tra",
                    colorScale:["#00FF85","#0085FF"],
                    style:{strokeWidth:2,markRadius:5}
                }
            ],
            append:false,
            legend: true
        };

        let nMetadata = {
            names: [
                dTRange.type,
                "amount(£)",
                "tra"
            ],
            types: [
                "linear",
                "linear",
                "ordinal"
            ]
        };
        this.setState({ tableConfig:nTableConfig,
            metadata:nMetadata});

        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace(/{{condition}}/g, dTRange.conditionQuery);
        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace(/{{period}}/g, dTRange.periodQuery);

        // console.log(providerConfig.configs.config.queryData.query);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, providerConfig);
    };

    /**
     * Converts string data of the chart x-axis to integers.
     */
    convertDataToInt(data){
        for (let i = 0; i < data.length; i++) {
            data[i][0] = parseInt(data[i][0]);
        }

        return data;
    }

    render() {
        return (
            <div className="div-style-atag">
                <br/>
                <VizG
                    config={this.state.tableConfig}
                    metadata={this.state.metadata}
                    data={this.state.gData}
                    height={this.props.glContainer.height - 75}
                    width={this.props.glContainer.width + 100}
                />
            </div>
        );
    }

}

global.dashboard.registerWidget('AverageTransactionAmountGraph', AverageTransactionAmountGraph);

