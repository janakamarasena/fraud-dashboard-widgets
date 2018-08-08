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
import './TransactionGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import JssProvider from 'react-jss/lib/JssProvider';

const darkTheme = createMuiTheme({
    palette: {
        type: 'dark',
    },
});

const lightTheme = createMuiTheme({
    palette: {
        type: 'light',
    },
});

// Query columns
const QC_PERIOD = 0;
const QC_TRA = 2;

// Dynamic queries
const QUERY_AMOUNT = 'select '
    + '{{period}} as period, '
    + 'round(sum(amount), 2)  as amount, '
    + 'if(isSCAApplied = 1, "SCA", "EXEMPTED") as tra '
    + 'from TransactionsHistory where {{condition}} group by period, isSCAApplied order by period asc, tra desc #';
const QUERY_COUNT = 'select '
    + '{{period}} as period, '
    + 'count(*) as count, '
    + 'if(isSCAApplied = 1, "SCA", "EXEMPTED") as tra '
    + 'from TransactionsHistory where {{condition}} group by  period, isSCAApplied order by period asc, tra desc #';

// Chart colors scales
const SCA_FIRST = ['#00FF85', '#0085FF'];
const EXEMPTED_FIRST = ['#0085FF', '#00FF85'];

/**
 * Displays graphs on payment transactions (Amounts and Counts) broken down as SCA and Exempted.
 */
class TransactionGraph extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            tValue: 0,
            dataProviderConf: null,
            metadata: null,
            chartConfig: null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            isInitialized: false,
            dTRange: null,
        };
        this.handleDataReceived = this.handleDataReceived.bind(this);
        this.handleTabChange = this.handleTabChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.updateWidgetConf = this.updateWidgetConf.bind(this);
        this.resetWidgetData = this.resetWidgetData.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
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
        if (!this.state.isInitialized) {
            this.setState({ isInitialized: true });
        }
        this.setState({ dTRange: receivedMsg });
        this.resetWidgetData();
        this.updateWidgetConf(this.state.tValue, receivedMsg);
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
     * @param {number} value Value of current tab.
     * @param {object} dTRange Object containing the message received from the DateTimeRangePicker widget.
     */
    updateWidgetConf(value, dTRange) {
        const yAxis = value === 0 ? 'amount(£)' : 'count';
        const nChartConfig = {
            x: dTRange.type,
            charts: [
                {
                    type: 'line',
                    y: yAxis,
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
                yAxis,
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
        providerConfig.configs.config.queryData.query = value === 0 ? QUERY_AMOUNT : QUERY_COUNT;
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
        this.setState({ chartConfig: nChartConfig, gData: TransactionGraph.convertDataToInt(data.data) });
    }

    /**
     * Handles the resizing of a widget component.
     */
    handleResize() {
        this.setState({ width: this.props.glContainer.width, height: this.props.glContainer.height });
    }

    /**
     * Toggles the view between Amount graph and Count graph.
     *
     * @param {number} value Value of the selected tab.
     */
    handleTabChange(value) {
        this.setState({ tValue: value });
        this.updateWidgetConf(value, this.state.dTRange);
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
            <div>
                <div className="tab-margins">
                    <JssProvider generateClassName={generateClassName}>
                        <MuiThemeProvider theme={this.props.muiTheme.name === 'dark' ? darkTheme : lightTheme}>
                            <Tabs
                                value={this.state.tValue}
                                indicatorColor="primary"
                                textColor="primary"
                                onChange={(e, v) => this.handleTabChange(v)}
                                centered
                            >
                                <Tab label="AMOUNT" />
                                <Tab label="COUNT" />
                            </Tabs>
                        </MuiThemeProvider>
                    </JssProvider>
                </div>
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

// This is the workaround suggested in https://github.com/marmelab/react-admin/issues/1782
const escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
let classCounter = 0;

export const generateClassName = (rule, styleSheet) => {
    classCounter += 1;
    if (process.env.NODE_ENV === 'production') {
        return `c${classCounter}`;
    }
    if (styleSheet && styleSheet.options.classNamePrefix) {
        let prefix = styleSheet.options.classNamePrefix;
        // Sanitize the string as will be used to prefix the generated class name.
        prefix = prefix.replace(escapeRegex, '-');
        if (prefix.match(/^Mui/)) {
            return `${prefix}-${rule.key}`;
        }
        return `${prefix}-${rule.key}-${classCounter}`;
    }
    return `${rule.key}-${classCounter}`;
};

global.dashboard.registerWidget('TransactionGraph', TransactionGraph);
