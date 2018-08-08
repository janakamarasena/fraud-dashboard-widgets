/*
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 Inc. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses. For specific
 * language governing the permissions and limitations under this license,
 * please see the license as well as any agreement you’ve entered into with
 * WSO2 governing the purchase of this software and any associated services.
 */

import React from 'react';
import Widget from '@wso2-dashboards/widget';
import './AverageTransactionAmountGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';

// Query columns
const QC_PERIOD = 0;
const QC_TRA = 2;

// Chart colors scales
const SCA_FIRST = ['#00FF85', '#0085FF'];
const EXEMPTED_FIRST = ['#0085FF', '#00FF85'];

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
            chartConfig: null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isInitialized: false,
        };
        this.handleDataReceived = this.handleDataReceived.bind(this);
        this.updateWidgetConf = this.updateWidgetConf.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.resetWidgetData = this.resetWidgetData.bind(this);
    }

    componentDidMount() {
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({ dataProviderConf: message.data.configs.providerConfig });
                // Subscribes to the DateTimeRangePicker widget.
                super.subscribe(this.setReceivedMsg);
                if (!this.state.isInitialized) {
                    // Sends initialization message to the DateTimeRangePicker widget.
                    super.publish('init');
                }
            })
            .catch((error) => {
                console.log('error', error);
            });
    }

    /**
     * Handles the message received from the DateTimeRangePicker widget.
     *
     * @param {object} receivedMsg Data sent by the DateTimeRangePicker widget.
     */
    setReceivedMsg(receivedMsg) {
        if (receivedMsg === 'init') {
            this.defaultFilter();
        }
        this.resetWidgetData();
        this.updateWidgetConf(receivedMsg);
    }

    /**
     * Removes data from the widget.
     */
    resetWidgetData() {
        this.setState({ gData: [] });
    }

    /**
     * Updates the providerConf of the widgetConf with a new SQL query.
     * Updates the config and metadata of the charts with new axis data.
     *
     * @param {object} dTRange Object containing the message received from the DateTimeRangePicker widget.
     */
    updateWidgetConf(dTRange) {
        const nChartConfig = {
            x: dTRange.type,
            charts: [
                {
                    type: 'line',
                    y: 'amount(£)',
                    color: 'tra',
                    colorScale: ['#00FF85', '#0085FF'],
                    style: { strokeWidth: 2, markRadius: 5 },
                },
            ],
            append: false,
            legend: true,
        };
        const nMetadata = {
            names: [
                dTRange.type,
                'amount(£)',
                'tra',
            ],
            types: [
                'linear',
                'linear',
                'ordinal',
            ],
        };
        this.setState({ chartConfig: nChartConfig, metadata: nMetadata });
        const providerConfig = _.cloneDeep(this.state.dataProviderConf);
        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query
            .replace(/{{condition}}/g, dTRange.conditionQuery)
            .replace(/{{period}}/g, dTRange.periodQuery);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this.handleDataReceived, providerConfig);
    }

    /**
     * Sets the state of the widget after receiving data from the provider.
     *
     * @param {object} data Object sent by the provider.
     */
    handleDataReceived(data) {
        const nChartConfig = this.state.chartConfig;
        // Keeps the chart legend colors consistent.
        nChartConfig.charts[0].colorScale = data.data[0][QC_TRA] === 'SCA' ? SCA_FIRST : EXEMPTED_FIRST;
        this.setState({ chartConfig: nChartConfig, gData: AverageTransactionAmountGraph.convertDataToInt(data.data) });
    }

    /**
     * Handles the resizing of a widget component.
     */
    handleResize() {
        this.setState({ width: this.props.glContainer.width, height: this.props.glContainer.height });
    }

    /**
     * Converts string data of the chart x-axis to integers.
     *
     * @param {array} data The data array inside the object sent by the provider.
     * @returns {array}  Received array with chart x-axis values converted to integers.
     */
    static convertDataToInt(data) {
        for (let i = 0; i < data.length; i++) {
            data[i][QC_PERIOD] = parseInt(data[i][QC_PERIOD], 10);
        }
        return data;
    }

    render() {
        return (
            <div className="container-atag">
                <br />
                <VizG
                    config={this.state.chartConfig}
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
