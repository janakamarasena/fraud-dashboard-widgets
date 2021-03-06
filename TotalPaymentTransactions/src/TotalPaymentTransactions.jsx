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
import './TotalPaymentTransactions.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';

// Query columns
const QC_SCA_COUNT = 0;
const QC_SCA_FRAUD_COUNT = 1;
const QC_SCA_AMOUNT = 2;
const QC_EXEMPT_COUNT = 3;
const QC_EXEMPT_FRAUD_COUNT = 4;
const QC_EXEMPT_AMOUNT = 5;
const QC_DRILL_DOWN_EXEMPT_AMOUNT = 1;
const QC_DRILL_DOWN_EXEMPT_COUNT = 2;
const QC_DRILL_DOWN_EXEMPT_PERCENTAGE = 3;

// Dynamic queries
const MAIN_QUERY = 'select '
    + '(select count(ID) from TransactionsHistory where {{condition}} and isSCAApplied = 1) as scaCount, '
    + '(select count(ID) from TransactionsHistory where {{condition}} and isSCAApplied = 1 and isFraud = 1) '
    + 'as scaFraudCount,'
    + '(select round(sum(amount), 2) from TransactionsHistory where {{condition}} and isSCAApplied =1) as scaAmount, '
    + '(select count(ID) from TransactionsHistory where {{condition}} and isSCAApplied = 0) as exemptCount, '
    + '(select count(ID) from TransactionsHistory where {{condition}} and isSCAApplied = 0 and isFraud = 1) '
    + 'as exemptFraudCount,  '
    + '(select round(sum(amount), 2) from TransactionsHistory where {{condition}} and isSCAApplied = 0) '
    + 'as exemptAmount '
    + 'from TransactionsHistory limit 1 #';
const DRILL_DOWN_QUERY = 'select '
    + 'a.exemption, '
    + 'round(sum(amount),2) as amount, '
    + 'count(ID)as count, '
    + 'round(((select count(ID) from TransactionsHistory b where {{condition}} and a.exemption = b.exemption )*100)/'
    + '(select count(ID) from TransactionsHistory where {{condition}} limit 1),2) as percentage, '
    + 'round(((select count(ID) from TransactionsHistory b where {{condition}} and a.exemption = b.exemption and  '
    + 'b.isFraud = 1 )*100)/(select count(ID) from TransactionsHistory where {{condition}} limit 1),2) as rate '
    + 'from TransactionsHistory a where {{condition}} and isSCAApplied = 0 group by exemption #';

/**
 * Displays data related to payment transactions.
 */
class TotalPaymentTransactions extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            totCount: 0,
            totAmount: 0,
            totFraudRate: 0,
            scaCount: 0,
            scaAmount: 0,
            scaFraudRate: 0,
            exemptCount: 0,
            exemptAmount: 0,
            exemptFraudRate: 0,
            scaPercent: 0,
            exemptPercent: 0,
            isExemptDrillDownVisible: false,
            data: null,
            dataProviderConf: null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height,
            drillDownData: [],
            drillDownExemptionAmount: 0,
            drillDownExemptionCount: 0,
            drillDownExemptionPercentage: 0,
            isInitialized: false,
            dTRange: null,
        };
        this.drillDownTableConfig = {
            charts: [
                {
                    type: 'table',
                    columns: [
                        {
                            name: 'exemption',
                            title: 'Exemption',
                        },
                        {
                            name: 'count',
                            title: 'Transactions',
                        },
                        {
                            name: 'amount',
                            title: 'Amount(£)',
                        },
                        {
                            name: 'percentage',
                            title: 'Percentage',
                        },
                        {
                            name: 'rate',
                            title: 'Fraud Rate(%)',
                        },
                    ],
                },
            ],
            legend: false,
            append: false,
        };
        this.drillDownMetadata = {
            names: [
                'exemption',
                'amount',
                'count',
                'percentage',
                'rate',
            ],
            types: [
                'ordinal',
                'linear',
                'linear',
                'linear',
                'linear',
            ],
        };
        this.setReceivedMsg = this.setReceivedMsg.bind(this);
        this.handleDataReceived = this.handleDataReceived.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.showDrillDownView = this.showDrillDownView.bind(this);
        this.updateProviderConf = this.updateProviderConf.bind(this);
        this.resetWidgetData = this.resetWidgetData.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
    }

    componentDidMount() {
        //  super.subscribe(this.setReceivedMsg);
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
        this.updateProviderConf(this.state.isExemptDrillDownVisible, receivedMsg);
    }

    /**
     * Removes data from the widget.
     */
    resetWidgetData() {
        this.setState({
            drillDownData: [[]],
            drillDownExemptionAmount: 0,
            drillDownExemptionCount: 0,
            drillDownExemptionPercentage: 0,
        });
    }

    /**
     * Updates the providerConf of the widgetConf with a new SQL query.
     *
     * @param {boolean} val Value of isExemptDrillDownVisible.
     * @param {object} dTRange Object containing the message received from the DateTimeRangePicker widget.
     */
    updateProviderConf(val, dTRange) {
        const providerConfig = _.cloneDeep(this.state.dataProviderConf);
        providerConfig.configs.config.queryData.query = val === true ? DRILL_DOWN_QUERY : MAIN_QUERY;
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
        if (!this.state.isExemptDrillDownVisible) {
            const nTotAmount = TotalPaymentTransactions.roundToTwoDecimals(
                data.data[0][QC_SCA_AMOUNT] + data.data[0][QC_EXEMPT_AMOUNT],
            );
            if (nTotAmount !== this.state.totAmount) {
                const nSCAPercent = TotalPaymentTransactions.getPercentage(
                    data.data[0][QC_SCA_COUNT], data.data[0][QC_SCA_COUNT], data.data[0][QC_EXEMPT_COUNT],
                );
                const nExemptPercent = TotalPaymentTransactions.getPercentage(
                    data.data[0][QC_EXEMPT_COUNT], data.data[0][QC_SCA_COUNT], data.data[0][QC_EXEMPT_COUNT],
                );
                const nTotCount = data.data[0][QC_SCA_COUNT] + data.data[0][QC_EXEMPT_COUNT];
                const nTotFraudRate = TotalPaymentTransactions.getFraudRate(
                    data.data[0][QC_SCA_FRAUD_COUNT] + data.data[0][QC_EXEMPT_FRAUD_COUNT], nTotCount,
                );
                const nSCAFraudRate = TotalPaymentTransactions.getFraudRate(
                    data.data[0][QC_SCA_FRAUD_COUNT], data.data[0][QC_SCA_COUNT],
                );
                const nExemptFraudRate = TotalPaymentTransactions.getFraudRate(
                    data.data[0][QC_EXEMPT_FRAUD_COUNT], data.data[0][QC_EXEMPT_COUNT],
                );
                this.setState({
                    totCount: nTotCount,
                    totAmount: nTotAmount,
                    totFraudRate: nTotFraudRate,
                    scaCount: data.data[0][QC_SCA_COUNT],
                    scaAmount: data.data[0][QC_SCA_AMOUNT],
                    scaFraudRate: nSCAFraudRate,
                    exemptCount: data.data[0][QC_EXEMPT_COUNT],
                    exemptAmount: data.data[0][QC_EXEMPT_AMOUNT],
                    exemptFraudRate: nExemptFraudRate,
                    scaPercent: nSCAPercent,
                    exemptPercent: nExemptPercent,
                    data: [
                        {
                            x: 1,
                            y: nSCAPercent,
                        },
                        {
                            x: 2,
                            y: nExemptPercent,
                        },
                    ],
                });
            }
        } else {
            const nDrillDownData = TotalPaymentTransactions.getDrillDownData(data.data);
            if (this.state.drillDownExemptionAmount !== nDrillDownData.amount) {
                this.setState({
                    drillDownData: data.data,
                    drillDownExemptionAmount: nDrillDownData.amount,
                    drillDownExemptionCount: nDrillDownData.count,
                    drillDownExemptionPercentage: nDrillDownData.percentage,
                });
            }
        }
    }

    /**
     * Handles the resizing of a widget component.
     */
    handleResize() {
        this.setState({ width: this.props.glContainer.width, height: this.props.glContainer.height });
    }

    /**
     * Calculates percentage values required for the widget.
     *
     * @param {number} val Value.
     * @param {number} totSCA Total sca value.
     * @param {number} totExempted Total exempted value.
     * @returns {number} Percentage rounded to two decimals.
     */
    static getPercentage(val, totSCA, totExempted) {
        const tot = totSCA + totExempted;
        if (val && tot) {
            return TotalPaymentTransactions.roundToTwoDecimals((val * 100) / tot);
        }
        return 0;
    }

    /**
     * Calculates fraud rate values required for the widget.
     *
     * @param {number} valFraud Value.
     * @param {number} valTot Total.
     * @returns {number} Fraud rate rounded to two decimals.
     */
    static getFraudRate(valFraud, valTot) {
        if (valFraud && valTot) {
            return TotalPaymentTransactions.roundToTwoDecimals((valFraud * 100) / valTot);
        }
        return 0;
    }

    /**
     * Calculates the exemption amount, exemption count and exemption percentage
     * required for the drill down view of the widget.
     *
     * @param {array} data The data array inside the object sent by the provider.
     * @returns {object} Object with exemption amount, exemption count and exemption percentage rounded to two decimals.
     */
    static getDrillDownData(data) {
        let amount = 0;
        let count = 0;
        let percentage = 0;
        for (let i = 0; i < data.length; i++) {
            amount += data[i][QC_DRILL_DOWN_EXEMPT_AMOUNT];
            count += data[i][QC_DRILL_DOWN_EXEMPT_COUNT];
            percentage += data[i][QC_DRILL_DOWN_EXEMPT_PERCENTAGE];
        }
        amount = TotalPaymentTransactions.roundToTwoDecimals(amount);
        count = TotalPaymentTransactions.roundToTwoDecimals(count);
        percentage = TotalPaymentTransactions.roundToTwoDecimals(percentage);
        return { amount, count, percentage };
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
        this.setState({ isExemptDrillDownVisible: val });
        this.updateProviderConf(val, this.state.dTRange);
    }

    render() {
        return (
            <div>
                <div className="main-container" hidden={this.state.isExemptDrillDownVisible}>
                    <h1>
                        £{this.state.totAmount}
                    </h1>
                    <h3 className="tot-amount-style">
                        {this.state.totCount} TRANSACTIONS
                    </h3>
                    <div className="fraud-rate">
                        {this.state.totFraudRate}% (FRAUD RATE)
                    </div>
                    <br />
                    <Grid container spacing="24">
                        <Grid item xs="7">
                            <svg viewBox="45 28 280 230" className="pointer">
                                <VictoryPie
                                    standalone={false}
                                    data={this.state.data}
                                    height="230"
                                    innerRadius="82"
                                    labels={() => ''}
                                    colorScale={['#00FF85', '#0085FF']}
                                    animate={{ duration: 100 }}
                                    events={[{
                                        target: 'data',
                                        eventHandlers: {
                                            onClick: (e, d) => {
                                                return d.index === 1 ? this.showDrillDownView(true) : null;
                                            },
                                        },
                                    }]}
                                />
                            </svg>
                        </Grid>
                        <Grid item xs={5}>
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
                                            <div className="legend-fraud-rate">
                                                {this.state.scaFraudRate}% (fraud rate)
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
                                            <div className="legend-fraud-rate">
                                                {this.state.exemptFraudRate}% (fraud rate)
                                            </div>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                    <p className="click-tip">
                        * Click on the Exempt slice to get a drill down view.
                    </p>
                </div>
                <div className="main-container" hidden={!this.state.isExemptDrillDownVisible}>
                    <div onClick={() => this.showDrillDownView(false)} className="drill-down-close">
                        &times;
                    </div>
                    <br />
                    <h2>
                        EXEMPTED ({this.state.drillDownExemptionPercentage}%)
                    </h2>
                    <h3 className="drill-down-sub-title-1">
                        {this.state.drillDownExemptionCount} TRANSACTIONS
                    </h3>
                    <h3 className="drill-down-sub-title-2">
                        £{this.state.drillDownExemptionAmount}
                    </h3>
                    <div style={{ margin: '20' }}>
                        <VizG
                            config={this.drillDownTableConfig}
                            metadata={this.drillDownMetadata}
                            data={this.state.drillDownData}
                            height={this.props.glContainer.height}
                            width={this.props.glContainer.width}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

global.dashboard.registerWidget('TotalPaymentTransactions', TotalPaymentTransactions);
