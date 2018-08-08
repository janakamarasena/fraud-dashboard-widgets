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
import { VictoryPie } from 'victory';
import Grid from '@material-ui/core/Grid';
import './TotalFraudulentTransactions.css';
import _ from 'lodash';

// Query columns
const QC_SCA_COUNT = 0;
const QC_SCA_AMOUNT = 1;
const QC_EXEMPT_COUNT = 2;
const QC_EXEMPT_AMOUNT = 3;
const QC_TOT_COUNT = 4;

/**
 * Displays data related to fraudulent payment transactions.
 */
class TotalFraudulentTransactions extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            fraudCount: 0,
            fraudAmount: 0,
            fraudPercent: 0,
            scaCount: 0,
            scaAmount: 0,
            exemptCount: 0,
            exemptAmount: 0,
            totCount: 0,
            scaPercent: 0,
            scaPercentFromTot: 0,
            exemptPercent: 0,
            exemptPercentFromTot: 0,
            nonFraudPercent: 0,
            data: null,
            drillDownData: null,
            mainVisibility: 'flex',
            drillDownVisibility: 'none',
            dataProviderConf: null,
            isInitialized: false,
        };
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.updateProviderConf = this.updateProviderConf.bind(this);
        this.handleDataReceived = this.handleDataReceived.bind(this);
        this.showDrillDownView = this.showDrillDownView.bind(this);
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
                console.log('error', error);// TODO: display in widget
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
        this.updateProviderConf(receivedMsg);
    }

    /**
     * Updates the providerConf of the widgetConf with a new SQL query.
     *
     * @param {object} dTRange Object containing the message received from the DateTimeRangePicker widget.
     */
    updateProviderConf(dTRange) {
        const providerConfig = _.cloneDeep(this.state.dataProviderConf);
        providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query
            .replace(/{{condition}}/g, dTRange.conditionQuery);
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this.handleDataReceived, providerConfig);
    }

    /**
     * Sets the state of the widget after receiving data from the provider.
     *
     * @param {object} data Object sent by the provider.
     */
    handleDataReceived(data) {
        const nTotCount = data.data[0][QC_TOT_COUNT];
        if (nTotCount !== this.state.totCount) {
            const nSCAAmount = data.data[0][QC_SCA_AMOUNT];
            const nExemptAmount = data.data[0][QC_EXEMPT_AMOUNT];
            const nFraudCount = data.data[0][QC_SCA_COUNT] + data.data[0][QC_EXEMPT_COUNT];
            const nFraudAmount = TotalFraudulentTransactions.roundToTwoDecimals(nSCAAmount + nExemptAmount);
            const nFraudPercent = TotalFraudulentTransactions.getPercentage(nFraudCount, nTotCount);
            const nSCAPercent = TotalFraudulentTransactions.getPercentage(data.data[0][QC_SCA_COUNT], nFraudCount);
            const nSCAPercentFromTot = TotalFraudulentTransactions.getPercentage(data.data[0][QC_SCA_COUNT], nTotCount);
            const nExemptPercent = TotalFraudulentTransactions.getPercentage(
                data.data[0][QC_EXEMPT_COUNT], nFraudCount,
            );
            const nExemptPercentFromTot = TotalFraudulentTransactions.getPercentage(
                data.data[0][QC_EXEMPT_COUNT], nTotCount,
            );
            const nonFraudPercent = 100 - nFraudPercent;
            this.setState({
                fraudCount: nFraudCount,
                fraudAmount: nFraudAmount,
                fraudPercent: nFraudPercent,
                scaCount: data.data[0][QC_SCA_COUNT],
                scaAmount: nSCAAmount,
                exemptCount: data.data[0][QC_EXEMPT_COUNT],
                exemptAmount: nExemptAmount,
                totCount: nTotCount,
                scaPercent: nSCAPercent,
                scaPercentFromTot: nSCAPercentFromTot,
                exemptPercent: nExemptPercent,
                exemptPercentFromTot: nExemptPercentFromTot,
                nonFraudPercent,
                data: [
                    {
                        x: 1,
                        y: nonFraudPercent,
                    },
                    {
                        x: 2,
                        y: nFraudPercent,
                    },
                ],
                drillDownData: [
                    {
                        x: 2,
                        y: nExemptPercentFromTot,
                    },
                    {
                        x: 3,
                        y: nSCAPercentFromTot,
                    },
                ],
            });
        }
    }

    /**
     * Calculates percentage values required for the widget.
     *
     * @param {number} val Value.
     * @param {number} tot Total.
     * @returns {number} Percentage rounded to two decimals.
     */
    static getPercentage(val, tot) {
        if (val && tot) {
            return TotalFraudulentTransactions.roundToTwoDecimals((val * 100) / tot);
        }
        return 0;
    }

    /**
     * Rounds up a given number to two decimals.
     *
     * @param {number} num Number.
     * @returns {number} Number rounded to two decimals.
     */
    static roundToTwoDecimals(num) {
        return Math.round(num * 100) / 100;
    }

    /**
     * Toggles the drill down view.
     *
     * @param {boolean} val Sets the visibility of the drill down view.
     */
    showDrillDownView(val) {
        if (val) {
            this.setState({
                mainVisibility: 'none',
                drillDownVisibility: 'flex',
            });
        } else {
            this.setState({
                mainVisibility: 'flex',
                drillDownVisibility: 'none',
            });
        }
    }

    render() {
        return (
            <div className="main-container">
                <h1>
                    £{this.state.fraudAmount}
                </h1>
                <h3 className="fraud-amount-style">
                    {this.state.fraudCount} FRAUDS
                </h3>
                <Grid container spacing="24" style={{ display: this.state.mainVisibility }}>
                    <Grid item xs="12">
                        <svg viewBox="0 40 400 120" className="tft-pointer">
                            <VictoryPie
                                standalone={false}
                                startAngle="90"
                                endAngle="-90"
                                data={this.state.data}
                                height="300"
                                innerRadius="80"
                                labels={() => ''}
                                colorScale={['#0a68ea38', '#0A68EA']}
                                animate={{ duration: 100 }}
                                events={[{
                                    target: 'data',
                                    eventHandlers: {
                                        onClick: () => {
                                            return this.showDrillDownView(true);
                                        },
                                    },
                                }]}
                            />
                        </svg>
                        <div className="tot-fraud">
                            <b>{this.state.fraudPercent}%</b> of total transactions
                        </div>
                        <p className="click-tip">
                            * Click on the chart to get a drill down view.
                        </p>
                    </Grid>
                </Grid>
                <Grid container spacing="24" style={{ display: this.state.drillDownVisibility, marginTop: '8' }}>
                    <div onClick={() => this.showDrillDownView(false)} className="drill-down-close">
                        &times;
                    </div>
                    <Grid item xs="7">
                        <svg viewBox="85 40 230 120">
                            <VictoryPie
                                standalone={false}
                                startAngle="90"
                                endAngle="-90"
                                data={this.state.drillDownData}
                                height="300"
                                innerRadius="80"
                                labels={() => ''}
                                colorScale={['#0085FF', '#00FF85']}
                                animate={{ duration: 100 }}
                            />
                        </svg>
                    </Grid>
                    <Grid item xs="5">
                        <Grid style={{ marginTop: '2' }} container direction="column" spacing="24">
                            <Grid item xs="12" style={{ marginTop: '-12' }}>
                                <Grid container>
                                    <Grid item xs="2">
                                        <div className="square-green" />
                                    </Grid>
                                    <Grid className="t-align" item xs="10">
                                        <div className="legend-name">
                                            SCA ({this.state.scaPercent}%)
                                        </div>
                                        <div className="legend-amount">
                                            £{this.state.scaAmount}
                                        </div>
                                        <div className="legend-count">
                                            {this.state.scaCount} transactions
                                        </div>
                                        <div className="legend-percent-from-total">
                                            {this.state.scaPercentFromTot}% of total transactions
                                        </div>
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item xs="12">
                                <Grid container>
                                    <Grid item xs="2">
                                        <div className="square-blue" />
                                    </Grid>
                                    <Grid className="t-align" item xs="10">
                                        <div className="legend-name">
                                            EXEMPTED ({this.state.exemptPercent}%)
                                        </div>
                                        <div className="legend-amount">
                                            £{this.state.exemptAmount}
                                        </div>
                                        <div className="legend-count">
                                            {this.state.exemptCount} transactions
                                        </div>
                                        <div className="legend-percent-from-total">
                                            {this.state.exemptPercentFromTot}% of total transactions
                                        </div>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </div>
        );
    }
}

global.dashboard.registerWidget('TotalFraudulentTransactions', TotalFraudulentTransactions);
